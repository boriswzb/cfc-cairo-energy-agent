import {
  BUILDING,
  COMFORT,
  SYSTEM_DEFAULTS,
  buildSolarSeries,
  equipmentFraction,
  freshAirFlowM3s,
  indoorTemperature,
  infiltrationFlowM3s,
  lightingFraction,
  occupancyFraction,
  simulateOpaqueAssembly,
  simulatePV,
  ventilationLoad,
  wallAssembly,
  roofAssembly,
  windowForOrientation,
} from '@cfc/energy-core';

const ORIENTATIONS = ['south', 'east', 'north', 'west'];

function sum(array) {
  let total = 0;
  for (const value of array) total += value;
  return total;
}

function mwh(kwArray) {
  return sum(kwArray) / 1000;
}

export function createFastEvaluator({ weather, building = BUILDING, baseline }) {
  if (!baseline) throw new Error('Fast evaluator requires a detailed baseline result');
  const n = weather.length;
  const solar = buildSolarSeries(weather, {
    latitude: building.latitude,
    longitude: building.longitude,
    timezone: building.timezone,
    albedo: building.envelope.groundAlbedo,
    pvTiltDeg: building.pv.tiltDeg,
    pvAzimuthDeg: building.pv.azimuthDeg,
  });
  const system = { ...SYSTEM_DEFAULTS };
  const officeIndoor = Float64Array.from(
    weather.map((row) => indoorTemperature('open_office', row)),
  );
  const officeShare = (building.totalArea - building.openlabArea) / building.totalArea;
  const gross = {
    south: building.width * building.floorHeight * building.floors.length * officeShare,
    north: building.width * building.floorHeight * building.floors.length * officeShare,
    east: building.depth * building.floorHeight * building.floors.length * officeShare,
    west: building.depth * building.floorHeight * building.floors.length * officeShare,
  };
  const roofArea = building.roofArea;

  // Precompute wall flux per m² for discrete insulation options.
  const insulationOptions = [80, 120, 160];
  const wallFlux = new Map();
  for (const mm of insulationOptions) {
    const assembly = wallAssembly(mm);
    const byOrientation = {};
    for (const orientation of ORIENTATIONS) {
      byOrientation[orientation] = simulateOpaqueAssembly({
        weather,
        solar,
        assembly,
        orientation,
        area: 1,
        indoorTemps: officeIndoor,
        absorptance: building.envelope.wallAbsorptance,
      }).hourlyW;
    }
    wallFlux.set(mm, byOrientation);
  }

  const roofFlux = simulateOpaqueAssembly({
    weather,
    solar,
    assembly: roofAssembly(building.envelope.roofInsulationMm),
    orientation: 'roof',
    area: 1,
    indoorTemps: officeIndoor,
    absorptance: building.envelope.roofAbsorptance,
    pvRoofShade: building.envelope.pvRoofShade,
    longwaveDrop: 6,
  }).hourlyW;

  const windowCache = new Map();
  function getWindowSeries(glazing, shading, orientation) {
    const key = `${glazing}|${shading}|${orientation}`;
    if (!windowCache.has(key)) {
      const result = windowForOrientation({
        weather,
        solar,
        glazingId: glazing,
        area: 1,
        indoorTemps: officeIndoor,
        shadingStrategy: shading,
        orientation,
      });
      windowCache.set(key, result);
    }
    return windowCache.get(key);
  }

  // Fixed office internal + ventilation gains, independent of envelope design.
  const fixedGainW = new Float64Array(n);
  for (const floor of building.floors) {
    for (const zone of floor.zones) {
      if (zone.type === 'openlab') continue;
      const p = zone.profile;
      const schedule = p.schedule;
      for (let i = 0; i < n; i += 1) {
        const row = weather[i];
        const occ = occupancyFraction(schedule, row);
        const people = zone.area * p.peopleDensity * occ;
        fixedGainW[i] += people * (p.sensibleWPerson + p.latentWPerson);
        fixedGainW[i] += zone.area * p.lightingWm2 * lightingFraction(schedule, row);
        fixedGainW[i] += zone.area * p.equipmentWm2 * equipmentFraction(schedule, row);
        const tIn = indoorTemperature(schedule, row);
        const ventFlow = freshAirFlowM3s(schedule, row, zone.area, p);
        if (ventFlow > 0) {
          const vent = ventilationLoad({
            flowM3s: ventFlow,
            tOut: row.tdb,
            rhOut: row.rh / 100,
            tIn,
            rhIn: COMFORT.indoorRh,
            pressure: row.pressure,
            sensibleRecovery: system.heatRecoverySensible,
          });
          fixedGainW[i] += (vent.sensible + vent.latent) * 1000;
        }
        const infil = ventilationLoad({
          flowM3s: infiltrationFlowM3s(zone.area, zone.height, occ > 0.04),
          tOut: row.tdb,
          rhOut: row.rh / 100,
          tIn,
          rhIn: COMFORT.indoorRh,
          pressure: row.pressure,
          sensibleRecovery: 0,
        });
        fixedGainW[i] += (infil.sensible + infil.latent) * 1000;
      }
    }
  }

  const openlabKW = baseline.hourly.openlabKW;
  const fixedDemandKW = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    fixedDemandKW[i] = Math.max(
      0,
      baseline.hourly.demandKW[i] -
        (baseline.hourly.coolingElecKW[i] + baseline.hourly.heatingElecKW[i]) *
          (1 + system.auxFactor),
    );
  }

  const pvOnly = simulatePV({
    weather,
    solar,
    pv: building.pv,
    demandKW: new Float64Array(n),
  });
  const pvAC = pvOnly.hourly.acKW;
  const pvYieldKWh = sum(pvAC);

  function evaluate(design) {
    const glazing = design.glazing;
    const shading = design.shading;
    const wall = wallFlux.get(design.wallInsulationMm) ?? wallFlux.get(100);
    const wwr = design.wwr;
    const windowArea = {
      south: gross.south * wwr,
      north: gross.north * wwr,
      east: gross.east * wwr,
      west: gross.west * wwr,
    };
    const opaqueArea = {
      south: gross.south * (1 - wwr),
      north: gross.north * (1 - wwr),
      east: gross.east * (1 - wwr),
      west: gross.west * (1 - wwr),
    };
    const windowTotal = windowArea.south + windowArea.north + windowArea.east + windowArea.west;
    const cooling = new Float64Array(n);
    const heating = new Float64Array(n);
    let peak = 0;
    let occupiedHours = 0;
    let unmetHours = 0;
    const windowSeries = {};
    for (const orientation of ORIENTATIONS) {
      windowSeries[orientation] = getWindowSeries(glazing, shading, orientation);
    }
    const capacityKW = ((building.conditionedArea * system.coolingCapacityWm2) / 1000) + 55;
    for (let i = 0; i < n; i += 1) {
      let net = fixedGainW[i] + roofArea * roofFlux[i];
      for (const orientation of ORIENTATIONS) {
        net += opaqueArea[orientation] * wall[orientation][i];
        net += windowArea[orientation] * (windowSeries[orientation].solarGain[i] + windowSeries[orientation].conduction[i]);
      }
      const officeCool = Math.max(0, net / 1000);
      const officeHeat = Math.max(0, -net / 1000);
      cooling[i] = officeCool + openlabKW[i];
      heating[i] = officeHeat;
      peak = Math.max(peak, cooling[i]);
      if (weather[i].hour >= 7 && weather[i].hour <= 19 && baseline.occupied[i]) {
        occupiedHours += 1;
        if (cooling[i] > capacityKW) unmetHours += 1;
      }
    }
    const coolingMWh = mwh(cooling);
    const heatingMWh = mwh(heating);
    const demand = new Float64Array(n);
    for (let i = 0; i < n; i += 1) {
      const cop = 2.75 + 0.45 * Math.min(1, cooling[i] / Math.max(1, capacityKW));
      const hvac = cooling[i] / cop + heating[i] / system.heatingCop;
      demand[i] = fixedDemandKW[i] + hvac * (1 + system.auxFactor);
    }
    let selfKWh = 0;
    let demandKWh = 0;
    for (let i = 0; i < n; i += 1) {
      selfKWh += Math.min(pvAC[i], demand[i]);
      demandKWh += demand[i];
    }
    return {
      design: { ...design },
      coolingMWh,
      heatingMWh,
      peakCoolingKW: peak,
      peakIntensityWm2: (peak * 1000) / building.conditionedArea,
      demandMWh: demandKWh / 1000,
      pvYieldMWh: pvYieldKWh / 1000,
      selfConsumedMWh: selfKWh / 1000,
      selfConsumptionRatio: pvYieldKWh > 0 ? selfKWh / pvYieldKWh : 0,
      selfSufficiencyRatio: demandKWh > 0 ? selfKWh / demandKWh : 0,
      comfortCompliance: 1 - unmetHours / Math.max(1, occupiedHours),
      unmetHours,
      seasonal:
        cooling.reduce((sumValue, value, index) => sumValue + (weather[index].month >= 6 && weather[index].month <= 9 ? value : 0), 0) /
        1000,
      totalWindowArea: windowTotal,
    };
  }

  return { evaluate, solar, pvAC, pvYieldKWh, fixedGainW, windowCache, wallFlux };
}
