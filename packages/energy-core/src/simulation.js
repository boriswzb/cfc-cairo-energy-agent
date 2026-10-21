import { BUILDING, DEFAULT_DESIGN } from './building.js';
import { COMFORT, MONTH_NAMES, SYSTEM_DEFAULTS } from './constants.js';
import {
  GLAZING_TYPES,
  facadeAreas,
  roofAssembly,
  simulateOpaqueAssembly,
  wallAssembly,
  windowForOrientation,
} from './envelope.js';
import { simulatePV } from './pv.js';
import { buildSolarSeries, ventilationLoad } from './weather.js';
import {
  equipmentFraction,
  freshAirFlowM3s,
  indoorTemperature,
  infiltrationFlowM3s,
  isWorkday,
  lightingFraction,
  occupancyFraction,
} from './schedules.js';
import { auditEnergyBalance, calibrateEnvelope } from './validation.js';

const ORIENTATIONS = ['south', 'east', 'north', 'west'];
const INTERNAL_KEYS = ['peopleSensible', 'peopleLatent', 'lighting', 'equipment', 'ventilationSensible', 'ventilationLatent', 'infiltrationSensible', 'infiltrationLatent'];

function zeros(n) {
  return new Float64Array(n);
}

function sum(array) {
  let total = 0;
  for (const value of array) total += value;
  return total;
}

function mwhFromKW(array) {
  return sum(array) / 1000;
}

function mwhFromW(array) {
  return sum(array) / 1e6;
}

function createBuckets(n) {
  const buckets = {};
  for (const key of [
    'wall',
    'roof',
    'windowConduction',
    'solar',
    'peopleSensible',
    'peopleLatent',
    'lighting',
    'equipment',
    'ventilationSensible',
    'ventilationLatent',
    'infiltrationSensible',
    'infiltrationLatent',
    'it',
    'ups',
  ]) {
    buckets[key] = zeros(n);
  }
  return buckets;
}

function componentMWh(buckets) {
  const result = {};
  for (const [key, array] of Object.entries(buckets)) result[key] = mwhFromW(array);
  result.total = Object.values(result).reduce((total, value) => total + value, 0);
  return result;
}

function profileType(floor) {
  if (floor.level === 0) return 'lobby';
  if (floor.level === 1) return 'training';
  return 'open_office';
}

function zoneWeight(zone) {
  const p = zone.profile;
  return zone.area * (p.peopleDensity * 120 + p.lightingWm2 + p.equipmentWm2 + 1);
}

export function simulateBuilding({
  weather,
  metadata = {},
  building = BUILDING,
  designInput = {},
  options = {},
}) {
  if (!Array.isArray(weather) || weather.length !== 8760) {
    throw new Error('simulateBuilding requires exactly 8760 hourly weather records');
  }
  const n = weather.length;
  const design = { ...DEFAULT_DESIGN, ...designInput };
  const glazing = GLAZING_TYPES[design.glazing] ?? GLAZING_TYPES.low_e_double;
  const wall = wallAssembly(design.wallInsulationMm);
  const roof = roofAssembly(design.roofInsulationMm);
  const facade = facadeAreas(building, design.wwr);
  const pvConfig = {
    ...building.pv,
    ...(design.pv ?? {}),
    capacityKWp: design.pvCapacityKWp ?? building.pv.capacityKWp,
  };
  const solar = options.solar ?? buildSolarSeries(weather, {
    latitude: building.latitude,
    longitude: building.longitude,
    timezone: building.timezone,
    albedo: building.envelope.groundAlbedo,
    pvTiltDeg: pvConfig.tiltDeg,
    pvAzimuthDeg: pvConfig.azimuthDeg,
  });
  const system = { ...SYSTEM_DEFAULTS, ...(options.system ?? {}) };
  const calibration = options.calibration ?? calibrateEnvelope({ wall, roof });
  const wallFactor = calibration.wallFactor;
  const roofFactor = calibration.roofFactor;

  const coolingKW = zeros(n);
  const heatingKW = zeros(n);
  const coolingElecKW = zeros(n);
  const heatingElecKW = zeros(n);
  const lightingElecW = zeros(n);
  const equipmentElecW = zeros(n);
  const itElecKW = zeros(n);
  const elevatorKW = zeros(n);
  const openlabCoolingKW = zeros(n);
  const demandKW = zeros(n);
  const occupied = new Uint8Array(n);
  const components = createBuckets(n);
  const openlabBuckets = createBuckets(n);
  const floorResults = [];
  let occupiedHours = 0;
  let unmetHours = 0;
  let peakCoolingKW = 0;
  let peakHeatingKW = 0;

  for (const floor of building.floors) {
    const indoor = Float64Array.from(
      weather.map((row) => indoorTemperature(profileType(floor), row)),
    );
    const env = {
      wall: zeros(n),
      roof: zeros(n),
      windowConduction: zeros(n),
      solar: zeros(n),
    };

    for (const orientation of ORIENTATIONS) {
      const wallResult = simulateOpaqueAssembly({
        weather,
        solar,
        assembly: wall,
        orientation,
        area: facade[orientation].opaque,
        indoorTemps: indoor,
        absorptance: building.envelope.wallAbsorptance,
      });
      const windowResult = windowForOrientation({
        weather,
        solar,
        glazingId: design.glazing,
        area: facade[orientation].window,
        indoorTemps: indoor,
        shadingStrategy: design.shading,
        orientation,
      });
      for (let i = 0; i < n; i += 1) {
        env.wall[i] += wallResult.hourlyW[i] * wallFactor;
        env.windowConduction[i] += windowResult.conduction[i];
        env.solar[i] += windowResult.solarGain[i];
      }
    }

    if (floor.level === building.floors.length - 1) {
      const roofResult = simulateOpaqueAssembly({
        weather,
        solar,
        assembly: roof,
        orientation: 'roof',
        area: building.roofArea,
        indoorTemps: indoor,
        absorptance: building.envelope.roofAbsorptance,
        pvRoofShade: building.envelope.pvRoofShade,
        longwaveDrop: 6,
      });
      for (let i = 0; i < n; i += 1) env.roof[i] += roofResult.hourlyW[i] * roofFactor;
    }

    const openlabShare = floor.level === 1 ? building.openlabArea / building.floorArea : 0;
    const officeShare = 1 - openlabShare;

    // Envelope components: office share and separately metered Openlab share.
    for (let i = 0; i < n; i += 1) {
      components.wall[i] += env.wall[i] * officeShare;
      components.roof[i] += env.roof[i] * officeShare;
      components.windowConduction[i] += env.windowConduction[i] * officeShare;
      components.solar[i] += env.solar[i] * officeShare;
      if (openlabShare > 0) {
        openlabBuckets.wall[i] += env.wall[i] * openlabShare;
        openlabBuckets.windowConduction[i] += env.windowConduction[i] * openlabShare;
        openlabBuckets.solar[i] += env.solar[i] * openlabShare;
      }
    }

    // Internal gains from each occupied zone, computed once per floor.
    const gains = createBuckets(n);
    const floorOccupied = new Uint8Array(n);
    for (const zone of floor.zones) {
      if (zone.type === 'openlab') continue;
      const p = zone.profile;
      const schedule = p.schedule;
      for (let i = 0; i < n; i += 1) {
        const row = weather[i];
        const occ = occupancyFraction(schedule, row);
        if (occ > 0.04) floorOccupied[i] = 1;
        const people = zone.area * p.peopleDensity * occ;
        gains.peopleSensible[i] += people * p.sensibleWPerson;
        gains.peopleLatent[i] += people * p.latentWPerson;
        gains.lighting[i] += zone.area * p.lightingWm2 * lightingFraction(schedule, row);
        gains.equipment[i] += zone.area * p.equipmentWm2 * equipmentFraction(schedule, row);
        const ventFlow = freshAirFlowM3s(schedule, row, zone.area, p);
        if (ventFlow > 0) {
          const vent = ventilationLoad({
            flowM3s: ventFlow,
            tOut: row.tdb,
            rhOut: row.rh / 100,
            tIn: indoor[i],
            rhIn: COMFORT.indoorRh,
            pressure: row.pressure,
            sensibleRecovery: system.heatRecoverySensible,
          });
          gains.ventilationSensible[i] += vent.sensible * 1000;
          gains.ventilationLatent[i] += vent.latent * 1000;
        }
        const infil = ventilationLoad({
          flowM3s: infiltrationFlowM3s(zone.area, zone.height, occ > 0.04),
          tOut: row.tdb,
          rhOut: row.rh / 100,
          tIn: indoor[i],
          rhIn: COMFORT.indoorRh,
          pressure: row.pressure,
          sensibleRecovery: 0,
        });
        gains.infiltrationSensible[i] += infil.sensible * 1000;
        gains.infiltrationLatent[i] += infil.latent * 1000;
      }
    }

    const floorCooling = zeros(n);
    const floorHeating = zeros(n);
    let floorPeak = 0;
    let floorHeatingPeak = 0;
    for (let i = 0; i < n; i += 1) {
      let sensible = env.wall[i] * officeShare + env.roof[i] * officeShare +
        env.windowConduction[i] * officeShare + env.solar[i] * officeShare;
      let latent = 0;
      for (const key of ['peopleSensible', 'lighting', 'equipment', 'ventilationSensible', 'infiltrationSensible']) {
        sensible += gains[key][i];
      }
      for (const key of ['peopleLatent', 'ventilationLatent', 'infiltrationLatent']) latent += gains[key][i];
      const net = (sensible + latent) / 1000;
      const cooling = Math.max(0, net);
      const heating = Math.max(0, -net);
      floorCooling[i] = cooling;
      floorHeating[i] = heating;
      coolingKW[i] += cooling;
      heatingKW[i] += heating;
      lightingElecW[i] += gains.lighting[i];
      equipmentElecW[i] += gains.equipment[i];
      floorPeak = Math.max(floorPeak, cooling);
      floorHeatingPeak = Math.max(floorHeatingPeak, heating);
      if (floorOccupied[i]) {
        occupied[i] = 1;
        occupiedHours += 1;
        const capacity = (floor.area * officeShare * system.coolingCapacityWm2) / 1000;
        if (cooling > capacity) unmetHours += 1;
      }
    }

    for (const key of INTERNAL_KEYS) {
      const target = components[key];
      const source = gains[key];
      for (let i = 0; i < n; i += 1) target[i] += source[i];
    }

    const totalWeight = floor.zones
      .filter((zone) => zone.type !== 'openlab')
      .reduce((total, zone) => total + zoneWeight(zone), 0);
    const zones = floor.zones
      .filter((zone) => zone.type !== 'openlab')
      .map((zone) => ({
        id: zone.id,
        name: zone.name,
        type: zone.type,
        area: zone.area,
        annualCoolingMWh: (mwhFromKW(floorCooling) * zoneWeight(zone)) / Math.max(totalWeight, 1),
        peakKW: (floorPeak * zoneWeight(zone)) / Math.max(totalWeight, 1),
        share: zoneWeight(zone) / Math.max(totalWeight, 1),
      }));

    floorResults.push({
      level: floor.level,
      name: floor.name,
      short: floor.short,
      area: floor.area,
      conditionedArea: floor.area * officeShare,
      coolingMWh: mwhFromKW(floorCooling),
      heatingMWh: mwhFromKW(floorHeating),
      peakCoolingKW: floorPeak,
      peakHeatingKW: floorHeatingPeak,
      peakIntensityWm2: (floorPeak * 1000) / Math.max(floor.area * officeShare, 1),
      coolingIntensityKWhM2: (mwhFromKW(floorCooling) * 1000) / Math.max(floor.area * officeShare, 1),
      lightingMWh: mwhFromW(gains.lighting),
      equipmentMWh: mwhFromW(gains.equipment),
      zones,
    });
    peakCoolingKW = Math.max(peakCoolingKW, floorPeak);
    peakHeatingKW = Math.max(peakHeatingKW, floorHeatingPeak);
  }

  // Openlab dedicated 24/7 system.
  const openlab = building.floors
    .find((floor) => floor.level === 1)
    .zones.find((zone) => zone.type === 'openlab');
  const openlabProfile = openlab.profile;
  let openlabPeak = 0;
  const openlabTotals = {
    it: 0,
    ups: 0,
    lighting: 0,
    equipment: 0,
    peopleSensible: 0,
    peopleLatent: 0,
    ventilationSensible: 0,
    ventilationLatent: 0,
    infiltrationSensible: 0,
    infiltrationLatent: 0,
  };
  for (let i = 0; i < n; i += 1) {
    const row = weather[i];
    const people = openlab.area * openlabProfile.peopleDensity * 0.08;
    const it = building.special.openlab.itLoadKW * 1000;
    const ups = building.special.openlab.upsLossKW * 1000;
    const lighting = openlab.area * openlabProfile.lightingWm2;
    const equipment = openlab.area * openlabProfile.equipmentWm2;
    const vent = ventilationLoad({
      flowM3s: building.special.openlab.freshAirLps / 1000,
      tOut: row.tdb,
      rhOut: row.rh / 100,
      tIn: openlabProfile.setpointC,
      rhIn: 0.45,
      pressure: row.pressure,
      sensibleRecovery: 0,
    });
    const infil = ventilationLoad({
      flowM3s: infiltrationFlowM3s(openlab.area, openlab.height, true),
      tOut: row.tdb,
      rhOut: row.rh / 100,
      tIn: openlabProfile.setpointC,
      rhIn: 0.45,
      pressure: row.pressure,
      sensibleRecovery: 0,
    });
    const envelope = openlabBuckets.wall[i] + openlabBuckets.windowConduction[i] + openlabBuckets.solar[i];
    const net = (envelope + it + ups + lighting + equipment +
      people * openlabProfile.sensibleWPerson + people * openlabProfile.latentWPerson +
      vent.sensible * 1000 + vent.latent * 1000 + infil.sensible * 1000 + infil.latent * 1000) / 1000;
    openlabCoolingKW[i] = Math.max(0, net);
    itElecKW[i] += building.special.openlab.itLoadKW;
    openlabPeak = Math.max(openlabPeak, openlabCoolingKW[i]);
    openlabTotals.it += it;
    openlabTotals.ups += ups;
    openlabTotals.lighting += lighting;
    openlabTotals.equipment += equipment;
    openlabTotals.peopleSensible += people * openlabProfile.sensibleWPerson;
    openlabTotals.peopleLatent += people * openlabProfile.latentWPerson;
    openlabTotals.ventilationSensible += vent.sensible * 1000;
    openlabTotals.ventilationLatent += vent.latent * 1000;
    openlabTotals.infiltrationSensible += infil.sensible * 1000;
    openlabTotals.infiltrationLatent += infil.latent * 1000;
  }

  // HVAC electricity with part-load chiller efficiency and auxiliaries.
  const officeCapacityKW = building.floors.reduce(
    (total, floor) => total + floor.area * system.coolingCapacityWm2,
    0,
  ) / 1000;
  for (let i = 0; i < n; i += 1) {
    const officeLoad = coolingKW[i];
    const openlabLoad = openlabCoolingKW[i];
    const plr = Math.min(1, officeLoad / Math.max(1, officeCapacityKW));
    const cop = 2.75 + 0.45 * plr;
    coolingElecKW[i] = officeLoad / cop + openlabLoad / system.openlabCop;
    heatingElecKW[i] = heatingKW[i] / system.heatingCop;
    if (isWorkday(weather[i]) && weather[i].hour >= 7 && weather[i].hour <= 19) {
      elevatorKW[i] = system.elevatorKW;
    }
    demandKW[i] =
      (coolingElecKW[i] + heatingElecKW[i]) * (1 + system.auxFactor) +
      lightingElecW[i] / 1000 +
      equipmentElecW[i] / 1000 +
      itElecKW[i] +
      building.special.openlab.upsLossKW +
      elevatorKW[i];
  }

  const pv = simulatePV({
    weather,
    solar,
    pv: pvConfig,
    demandKW,
    gridFactorKgPerKWh: options.gridFactorKgPerKWh ?? 0.43,
  });

  const openlabComponents = {
    envelope:
      mwhFromW(openlabBuckets.wall) +
      mwhFromW(openlabBuckets.windowConduction) +
      mwhFromW(openlabBuckets.solar),
    it: openlabTotals.it / 1e6,
    ups: openlabTotals.ups / 1e6,
    lighting: openlabTotals.lighting / 1e6,
    equipment: openlabTotals.equipment / 1e6,
    peopleSensible: openlabTotals.peopleSensible / 1e6,
    peopleLatent: openlabTotals.peopleLatent / 1e6,
    ventilationSensible: openlabTotals.ventilationSensible / 1e6,
    ventilationLatent: openlabTotals.ventilationLatent / 1e6,
    infiltrationSensible: openlabTotals.infiltrationSensible / 1e6,
    infiltrationLatent: openlabTotals.infiltrationLatent / 1e6,
  };
  openlabComponents.total = Object.values(openlabComponents).reduce((total, value) => total + value, 0);

  const officeComponents = componentMWh(components);
  const combinedComponents = {
    ...officeComponents,
    openlabEnvelope: openlabComponents.envelope,
    openlabIt: openlabComponents.it,
    openlabUps: openlabComponents.ups,
    openlabLighting: openlabComponents.lighting,
    openlabEquipment: openlabComponents.equipment,
    openlabVentilationSensible: openlabComponents.ventilationSensible,
    openlabVentilationLatent: openlabComponents.ventilationLatent,
    openlabInfiltrationSensible: openlabComponents.infiltrationSensible,
    openlabInfiltrationLatent: openlabComponents.infiltrationLatent,
  };
  combinedComponents.total =
    officeComponents.total +
    openlabComponents.it + openlabComponents.ups + openlabComponents.lighting +
    openlabComponents.equipment + openlabComponents.peopleSensible + openlabComponents.peopleLatent +
    openlabComponents.ventilationSensible + openlabComponents.ventilationLatent +
    openlabComponents.infiltrationSensible + openlabComponents.infiltrationLatent + openlabComponents.envelope;

  const annualCoolingMWh = mwhFromKW(coolingKW) + mwhFromKW(openlabCoolingKW);
  const annualHeatingMWh = mwhFromKW(heatingKW);
  const annualCoolingElectricityMWh = mwhFromKW(coolingElecKW);
  const annualHeatingElectricityMWh = mwhFromKW(heatingElecKW);
  const annualBuildingElectricityMWh = mwhFromKW(demandKW);
  const totalPeakCoolingKW = coolingKW.reduce(
    (peak, value, index) => Math.max(peak, value + openlabCoolingKW[index]),
    0,
  );
  const coolingIntensityKWhM2 = (annualCoolingMWh * 1000) / building.conditionedArea;
  const comfortCompliance = Math.max(0, 1 - unmetHours / Math.max(1, occupiedHours));

  const monthly = MONTH_NAMES.map((name, index) => ({
    month: index + 1,
    name,
    coolingMWh: 0,
    heatingMWh: 0,
    coolingElectricityMWh: 0,
    heatingElectricityMWh: 0,
    openlabCoolingMWh: 0,
    lightingMWh: 0,
    equipmentMWh: 0,
    itMWh: 0,
    demandMWh: 0,
    pvYieldMWh: 0,
    pvSelfMWh: 0,
    pvExportMWh: 0,
    gridImportMWh: 0,
    outdoorMeanC: 0,
    count: 0,
  }));
  for (let i = 0; i < n; i += 1) {
    const bucket = monthly[weather[i].month - 1];
    bucket.coolingMWh += (coolingKW[i] + openlabCoolingKW[i]) / 1000;
    bucket.heatingMWh += heatingKW[i] / 1000;
    bucket.coolingElectricityMWh += coolingElecKW[i] / 1000;
    bucket.heatingElectricityMWh += heatingElecKW[i] / 1000;
    bucket.openlabCoolingMWh += openlabCoolingKW[i] / 1000;
    bucket.lightingMWh += lightingElecW[i] / 1e6;
    bucket.equipmentMWh += equipmentElecW[i] / 1e6;
    bucket.itMWh += (itElecKW[i] + building.special.openlab.upsLossKW) / 1000;
    bucket.demandMWh += demandKW[i] / 1000;
    bucket.pvYieldMWh += pv.hourly.acKW[i] / 1000;
    bucket.pvSelfMWh += pv.hourly.selfKW[i] / 1000;
    bucket.pvExportMWh += pv.hourly.exportKW[i] / 1000;
    bucket.gridImportMWh += pv.hourly.importKW[i] / 1000;
    bucket.outdoorMeanC += weather[i].tdb;
    bucket.count += 1;
  }
  monthly.forEach((bucket) => {
    bucket.outdoorMeanC = Number((bucket.outdoorMeanC / bucket.count).toFixed(1));
    delete bucket.count;
  });

  const julyOpenlab = Array.from({ length: 24 }, (_, hour) => {
    const indexes = weather
      .map((row, index) => (row.month === 7 && row.hour === hour ? index : -1))
      .filter((index) => index >= 0);
    return indexes.reduce((total, index) => total + openlabCoolingKW[index], 0) / Math.max(1, indexes.length);
  });

  const validation = auditEnergyBalance({
    components: combinedComponents,
    annualCoolingMWh,
    annualHeatingMWh,
    calibration,
    weather,
    extreme: options.extreme ?? null,
  });

  return {
    design,
    building,
    weatherMeta: metadata,
    weather,
    solar,
    envelope: { wall, roof, glazing, facade, shading: design.shading },
    summary: {
      annualCoolingMWh,
      annualHeatingMWh,
      annualCoolingElectricityMWh,
      annualHeatingElectricityMWh,
      annualHvacElectricityMWh: annualCoolingElectricityMWh + annualHeatingElectricityMWh,
      annualBuildingElectricityMWh,
      annualLightingMWh: mwhFromW(lightingElecW),
      annualEquipmentMWh: mwhFromW(equipmentElecW),
      annualItMWh: mwhFromKW(itElecKW) + (building.special.openlab.upsLossKW * 8760) / 1000,
      annualOpenlabCoolingMWh: mwhFromKW(openlabCoolingKW),
      peakCoolingKW: totalPeakCoolingKW,
      peakHeatingKW,
      peakCoolingIntensityWm2: (totalPeakCoolingKW * 1000) / building.conditionedArea,
      coolingIntensityKWhM2,
      heatingIntensityKWhM2: (annualHeatingMWh * 1000) / building.conditionedArea,
      coolingShare: annualCoolingMWh / Math.max(1e-9, annualCoolingMWh + annualHeatingMWh),
      comfortCompliance,
      unmetHours,
      occupiedHours,
      openlabPeakKW: openlabPeak,
      openlabShare: annualCoolingMWh > 0 ? mwhFromKW(openlabCoolingKW) / annualCoolingMWh : 0,
      pvYieldMWh: pv.annual.yieldMWh,
      pvSelfConsumedMWh: pv.annual.selfConsumedMWh,
      pvExportMWh: pv.annual.exportMWh,
      pvSelfConsumptionRatio: pv.annual.selfConsumptionRatio,
      pvSelfSufficiencyRatio: pv.annual.selfSufficiencyRatio,
      gridImportMWh: pv.annual.importMWh,
      co2AvoidedTonnes: pv.annual.co2AvoidedTonnes,
      specificYieldKWhPerKWp: pv.annual.specificYieldKWhPerKWp,
    },
    monthly,
    floors: floorResults,
    openlab: {
      area: openlab.area,
      itLoadKW: building.special.openlab.itLoadKW,
      upsLossKW: building.special.openlab.upsLossKW,
      setpointC: openlabProfile.setpointC,
      coolingMWh: mwhFromKW(openlabCoolingKW),
      electricityMWh: mwhFromKW(openlabCoolingKW) / system.openlabCop +
        (building.special.openlab.itLoadKW + building.special.openlab.upsLossKW) * 8760 / 1000,
      coolingElectricityMWh: mwhFromKW(openlabCoolingKW) / system.openlabCop,
      peakKW: openlabPeak,
      intensityWm2: (openlabPeak * 1000) / openlab.area,
      components: openlabComponents,
      julyProfile: julyOpenlab,
    },
    components: combinedComponents,
    officeComponents,
    openlabComponents,
    pv,
    calibration,
    validation,
    hourly: {
      time: weather.map((row) => row.iso),
      outdoorC: Float64Array.from(weather.map((row) => row.tdb)),
      ghi: Float64Array.from(weather.map((row) => row.ghi)),
      coolingKW,
      heatingKW,
      openlabKW: openlabCoolingKW,
      coolingElecKW,
      heatingElecKW,
      demandKW,
      pvKW: pv.hourly.acKW,
      pvSelfKW: pv.hourly.selfKW,
      gridImportKW: pv.hourly.importKW,
      gridExportKW: pv.hourly.exportKW,
    },
    occupied,
  };
}
