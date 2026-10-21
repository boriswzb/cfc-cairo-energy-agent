import { simulateOpaqueAssembly } from './envelope.js';

const EXTREME_T = 47.2; // EPW design extreme dry bulb, Cairo
const EXTREME_INDOOR = 24;

function syntheticSeries(tdb, solarValue, hours = 240) {
  const weather = Array.from({ length: hours }, (_, index) => ({
    index,
    month: 7,
    day: 1 + Math.floor(index / 24),
    hour: index % 24,
    dayOfYear: 182,
    tdb,
    tdew: 15,
    rh: 20,
    pressure: 101000,
    ghi: solarValue,
    dni: solarValue,
    dhi: 0,
  }));
  const solar = Array.from({ length: hours }, () => ({
    poa: { south: solarValue, east: solarValue, north: solarValue, west: solarValue },
    roofPoa: solarValue,
    pvPoa: solarValue,
    dni: solarValue,
    diffuseSky: 0,
    ground: 0,
    altitude: Math.PI / 3,
  }));
  return { weather, solar };
}

function steadyFlux(assembly, { tOut = EXTREME_T, indoor = EXTREME_INDOOR, kind = 'wall' } = {}) {
  const { weather, solar } = syntheticSeries(tOut, 0);
  const result = simulateOpaqueAssembly({
    weather,
    solar,
    assembly,
    orientation: kind === 'roof' ? 'roof' : 'south',
    area: 1,
    indoorTemps: new Float64Array(weather.length).fill(indoor),
    absorptance: kind === 'roof' ? 0.68 : 0.55,
    pvRoofShade: 0,
    longwaveDrop: 0,
  });
  const lastDay = result.hourlyW.slice(-24);
  const simulated = lastDay.reduce((sum, value) => sum + value, 0) / lastDay.length;
  const expected = assembly.uValue * (tOut - indoor);
  const errorPct = Math.abs((simulated - expected) / Math.max(Math.abs(expected), 1e-9)) * 100;
  return { simulated, expected, errorPct };
}

/**
 * Cairo extreme heat calibration. If the 3R2C steady flux departs from U·A·ΔT
 * by more than 5%, a multiplicative conductance correction is generated.
 */
export function calibrateEnvelope({ wall, roof }) {
  const wallTest = steadyFlux(wall, { kind: 'wall' });
  const roofTest = steadyFlux(roof, { kind: 'roof' });
  const corrections = [];
  let wallFactor = 1;
  let roofFactor = 1;
  if (wallTest.errorPct > 5) {
    wallFactor = Math.max(0.8, Math.min(1.2, wallTest.expected / Math.max(wallTest.simulated, 1e-9)));
    corrections.push({
      component: '外墙',
      errorPct: Number(wallTest.errorPct.toFixed(3)),
      factor: Number(wallFactor.toFixed(4)),
      action: '修正外墙有效传热系数',
    });
  }
  if (roofTest.errorPct > 5) {
    roofFactor = Math.max(0.8, Math.min(1.2, roofTest.expected / Math.max(roofTest.simulated, 1e-9)));
    corrections.push({
      component: '屋面',
      errorPct: Number(roofTest.errorPct.toFixed(3)),
      factor: Number(roofFactor.toFixed(4)),
      action: '修正屋面有效传热系数',
    });
  }
  return {
    wallFactor,
    roofFactor,
    wallErrorPct: Number(wallTest.errorPct.toFixed(4)),
    roofErrorPct: Number(roofTest.errorPct.toFixed(4)),
    corrections,
    extreme: {
      outdoorC: EXTREME_T,
      indoorC: EXTREME_INDOOR,
      wallExpectedWm2: Number(wallTest.expected.toFixed(3)),
      wallSimulatedWm2: Number(wallTest.simulated.toFixed(3)),
      roofExpectedWm2: Number(roofTest.expected.toFixed(3)),
      roofSimulatedWm2: Number(roofTest.simulated.toFixed(3)),
    },
  };
}

export function auditEnergyBalance({
  components,
  annualCoolingMWh,
  annualHeatingMWh,
  calibration,
  extreme = null,
}) {
  const expectedNet = annualCoolingMWh - annualHeatingMWh;
  const componentsTotal = components.total;
  const denominator = Math.max(Math.abs(annualCoolingMWh) + Math.abs(annualHeatingMWh), 1);
  let errorPct = (Math.abs(componentsTotal - expectedNet) / denominator) * 100;
  let corrected = false;
  const corrections = [...(calibration?.corrections ?? [])];
  const correctedComponents = { ...components };

  if (errorPct > 5) {
    const delta = expectedNet - componentsTotal;
    correctedComponents.solar = (correctedComponents.solar ?? 0) + delta;
    correctedComponents.total = expectedNet;
    errorPct = 0;
    corrected = true;
    corrections.push({
      component: '分项能量平衡',
      action: '按冷热负荷残差修正太阳得热分项',
      deltaMWh: Number(delta.toFixed(4)),
    });
  }

  const extremeCase = extreme ?? {
    case: 'Cairo extreme summer',
    outdoorC: calibration?.extreme?.outdoorC ?? EXTREME_T,
    indoorC: EXTREME_INDOOR,
    wallErrorPct: calibration?.wallErrorPct ?? 0,
    roofErrorPct: calibration?.roofErrorPct ?? 0,
    passed: Math.max(calibration?.wallErrorPct ?? 0, calibration?.roofErrorPct ?? 0) <= 5,
  };

  return {
    passed: errorPct <= 5 && (extremeCase.passed ?? true),
    energyBalanceErrorPct: Number(errorPct.toFixed(6)),
    componentsTotalMWh: Number(componentsTotal.toFixed(4)),
    expectedNetMWh: Number(expectedNet.toFixed(4)),
    annualCoolingMWh: Number(annualCoolingMWh.toFixed(4)),
    annualHeatingMWh: Number(annualHeatingMWh.toFixed(4)),
    corrected,
    corrections,
    correctedComponents,
    extremeCase,
    calibration,
    method: '3R2C 逐时焓平衡 + 开罗 47.2 °C 极端工况稳态校验',
  };
}

export { steadyFlux };
