import { COMFORT } from './constants.js';
import { orientationLabel } from './weather.js';

export const GLAZING_TYPES = {
  low_e_double: {
    id: 'low_e_double',
    name: 'Low-E 双银中空',
    short: 'Low-E 双银',
    uValue: 1.55,
    shgc: 0.31,
    vlt: 0.55,
    frameFraction: 0.1,
    frameU: 2.3,
    costIndex: 1.0,
    note: '基准配置，兼顾遮阳与可见光透过',
  },
  low_e_high_vlt: {
    id: 'low_e_high_vlt',
    name: '高透 Low-E 中空',
    short: '高透 Low-E',
    uValue: 1.4,
    shgc: 0.38,
    vlt: 0.65,
    frameFraction: 0.1,
    frameU: 2.3,
    costIndex: 1.12,
    note: '采光更好，但太阳得热略高',
  },
  low_e_triple: {
    id: 'low_e_triple',
    name: '三玻两腔 Low-E',
    short: '三玻 Low-E',
    uValue: 0.82,
    shgc: 0.23,
    vlt: 0.45,
    frameFraction: 0.12,
    frameU: 2.1,
    costIndex: 1.65,
    note: '传热与太阳得热最低，适合西向强辐射',
  },
  double_clear: {
    id: 'double_clear',
    name: '普通双白玻',
    short: '普通双玻',
    uValue: 2.6,
    shgc: 0.66,
    vlt: 0.72,
    frameFraction: 0.1,
    frameU: 2.7,
    costIndex: 0.65,
    note: '仅用于对照，不满足低辐射要求',
  },
};

export const SHADING_STRATEGIES = {
  none: { id: 'none', name: '无外遮阳', short: '无', beamSouth: 1, beamEastWest: 1, beamNorth: 1, diffuse: 1, costIndex: 0, note: '最大化冬季得热，但夏季冷负荷最高' },
  fixed: { id: 'fixed', name: '固定水平遮阳', short: '固定', beamSouth: 0.55, beamEastWest: 0.68, beamNorth: 0.9, diffuse: 0.92, costIndex: 0.4, note: '构造简单，无法随太阳角度调节' },
  seasonal: { id: 'seasonal', name: '季节可调遮阳', short: '季节', beamSouth: 0.44, beamEastWest: 0.56, beamNorth: 0.87, diffuse: 0.88, costIndex: 0.72, note: '5–10 月展开，冬季收起的基准策略' },
  smart: { id: 'smart', name: '智能时序遮阳', short: '智能', beamSouth: 0.34, beamEastWest: 0.42, beamNorth: 0.82, diffuse: 0.84, costIndex: 1.0, note: '按朝向、时段与太阳辐射动态调节，兼顾遮阳与采光' },
};

export const SHADING_OPTIONS = ['none', 'fixed', 'seasonal', 'smart'];
export const GLAZING_OPTIONS = ['low_e_double', 'low_e_high_vlt', 'low_e_triple', 'double_clear'];

export const WALL_LAYERS = (insulationMm) => [
  { name: '内抹灰', thickness: 0.015, k: 0.7, rho: 1600, cp: 900 },
  { name: '钢筋混凝土', thickness: 0.2, k: 1.7, rho: 2400, cp: 880 },
  { name: '保温层', thickness: Math.max(0, insulationMm) / 1000, k: 0.035, rho: 35, cp: 1400 },
  { name: '外饰面', thickness: 0.008, k: 0.8, rho: 1800, cp: 900 },
];

export const ROOF_LAYERS = (insulationMm = 100) => [
  { name: '内抹灰', thickness: 0.015, k: 0.7, rho: 1600, cp: 900 },
  { name: '钢筋混凝土', thickness: 0.2, k: 1.7, rho: 2400, cp: 880 },
  { name: 'XPS 保温', thickness: Math.max(0, insulationMm) / 1000, k: 0.03, rho: 35, cp: 1400 },
  { name: '水泥砂浆', thickness: 0.03, k: 0.93, rho: 1800, cp: 900 },
  { name: '防水卷材', thickness: 0.008, k: 0.2, rho: 1200, cp: 1000 },
];

export function assemblyProperties(layers, { kind = 'wall' } = {}) {
  const rsi = kind === 'roof' ? 0.1 : 0.13;
  const rse = 0.04;
  const rLayers = layers.reduce((sum, layer) => sum + layer.thickness / layer.k, 0);
  const capacitance = layers.reduce((sum, layer) => sum + layer.thickness * layer.rho * layer.cp, 0);
  const mass = layers.reduce((sum, layer) => sum + layer.thickness * layer.rho, 0);
  const uValue = 1 / (rsi + rLayers + rse);
  return {
    kind,
    layers,
    rsi,
    rse,
    rLayers,
    rTotal: rsi + rLayers + rse,
    uValue,
    capacitance,
    mass,
    thickness: layers.reduce((sum, layer) => sum + layer.thickness, 0),
  };
}

export function wallAssembly(insulationMm) {
  return {
    ...assemblyProperties(WALL_LAYERS(insulationMm), { kind: 'wall' }),
    insulationMm,
    id: `wall-${insulationMm}`,
    name: `混凝土墙 + ${insulationMm} mm 保温`,
  };
}

export function roofAssembly(insulationMm = 100) {
  return {
    ...assemblyProperties(ROOF_LAYERS(insulationMm), { kind: 'roof' }),
    insulationMm,
    id: `roof-${insulationMm}`,
    name: `屋面 + ${insulationMm} mm XPS`,
  };
}

function shadingFor(strategyId, solar, orientation, month, hour) {
  const strategy = SHADING_STRATEGIES[strategyId] ?? SHADING_STRATEGIES.seasonal;
  if (strategyId === 'none' || strategyId === 'fixed' || strategyId === 'seasonal') {
    if (strategyId === 'none') return { beam: 1, diffuse: 1 };
    const seasonal = strategyId === 'seasonal';
    const summer = month >= 5 && month <= 10;
    const beam = orientation === 'south'
      ? (seasonal && !summer ? 0.78 : strategy.beamSouth)
      : orientation === 'north'
        ? strategy.beamNorth
        : (seasonal && !summer ? 0.78 : strategy.beamEastWest);
    return { beam, diffuse: strategy.diffuse };
  }

  // Smart time-of-day louver control; retract when irradiance is low or in winter.
  const summer = month >= 4 && month <= 10;
  const daytime = hour >= 8 && hour <= 18;
  if (!summer || !daytime || solar.dni < 120) {
    return { beam: 0.82, diffuse: 0.94, mode: 'retracted' };
  }
  let beam = strategy.beamNorth;
  if (orientation === 'south') beam = strategy.beamSouth;
  else if (orientation === 'east') beam = hour <= 12 ? 0.33 : 0.62;
  else if (orientation === 'west') beam = hour >= 13 ? 0.32 : 0.62;
  // Preserve useful daylight in early morning / late afternoon.
  if ((hour <= 9 || hour >= 17) && orientation !== 'south') beam = Math.max(beam, 0.55);
  return { beam, diffuse: strategy.diffuse, mode: 'deployed' };
}

export function shadingFactor({ strategy, solar, orientation, month, hour }) {
  const result = shadingFor(strategy, solar, orientation, month, hour);
  return {
    ...result,
    label: SHADING_STRATEGIES[strategy]?.short ?? strategy,
    orientationLabel: orientationLabel(orientation),
  };
}

/**
 * 3R2C implicit finite-volume envelope model.
 * States: outer mass node T1 (°C), inner mass node T2 (°C).
 * Steady-state U = 1 / (Rse + Rlayers + Rsi).
 */
export function simulateOpaqueAssembly({
  weather,
  solar,
  assembly,
  orientation,
  area,
  indoorTemps,
  absorptance = 0.55,
  pvRoofShade = 0,
  hOut = 23,
  longwaveDrop = orientation === 'roof' ? 6 : 3.5,
}) {
  const n = weather.length;
  const output = new Float64Array(n);
  const rOut = 1 / hOut;
  const rLayer = assembly.rLayers;
  const rIn = assembly.rsi;
  const cTotal = Math.max(1000, assembly.capacitance);
  const c1 = cTotal / 2;
  const c2 = cTotal / 2;
  const dt = 3600;

  const first = weather[0];
  const firstSolar = solar[0];
  const firstI = orientation === 'roof'
    ? firstSolar.roofPoa * (1 - pvRoofShade)
    : firstSolar.poa[orientation];
  const firstTsa = first.tdb + (absorptance * firstI) / hOut - longwaveDrop;
  const q0 = assembly.uValue * (firstTsa - indoorTemps[0]);
  let t2 = indoorTemps[0] + q0 * rIn;
  let t1 = t2 + q0 * rLayer;

  const a11 = c1 / dt + 1 / rOut + 1 / rLayer;
  const a12 = -1 / rLayer;
  const a21 = -1 / rLayer;
  const a22 = c2 / dt + 1 / rLayer + 1 / rIn;

  for (let i = 0; i < n; i += 1) {
    const row = weather[i];
    const sun = solar[i];
    const incident = orientation === 'roof'
      ? sun.roofPoa * (1 - pvRoofShade)
      : sun.poa[orientation];
    const tSa = row.tdb + (absorptance * incident) / hOut - longwaveDrop;
    const b1 = (c1 * t1) / dt + tSa / rOut;
    const b2 = (c2 * t2) / dt + indoorTemps[i] / rIn;
    const det = a11 * a22 - a12 * a21;
    const t1Next = (b1 * a22 - a12 * b2) / det;
    const t2Next = (a11 * b2 - a21 * b1) / det;
    t1 = t1Next;
    t2 = t2Next;
    output[i] = ((t2 - indoorTemps[i]) / rIn) * area;
  }

  return {
    hourlyW: output,
    annualKWh: output.reduce((sum, value) => sum + value, 0) / 1000,
    orientation,
    area,
  };
}

export function windowForOrientation({ weather, solar, glazingId, area, indoorTemps, shadingStrategy, orientation }) {
  const glazing = GLAZING_TYPES[glazingId] ?? GLAZING_TYPES.low_e_double;
  const n = weather.length;
  const conduction = new Float64Array(n);
  const solarGain = new Float64Array(n);
  const uEffective = glazing.frameFraction * glazing.frameU + (1 - glazing.frameFraction) * glazing.uValue;
  const clearFraction = 1 - glazing.frameFraction;
  for (let i = 0; i < n; i += 1) {
    const row = weather[i];
    const sun = solar[i];
    const shade = shadingFactor({
      strategy: shadingStrategy,
      solar: sun,
      orientation,
      month: row.month,
      hour: row.hour,
    });
    const diffuse = sun.diffuseSky + sun.ground;
    const beam = sun.beam[orientation];
    const cosInc = row.dni > 1 ? Math.max(0, Math.min(1, beam / row.dni)) : 0;
    const iam = cosInc > 0 ? Math.max(0.55, Math.min(1, 1 - 0.1 * (1 / cosInc - 1))) : 1;
    const effectivePoa = beam * shade.beam + diffuse * shade.diffuse;
    conduction[i] = uEffective * area * (row.tdb - indoorTemps[i]);
    solarGain[i] = clearFraction * glazing.shgc * iam * effectivePoa * area;
  }
  return {
    conduction,
    solarGain,
    annualConductionKWh: conduction.reduce((sum, v) => sum + v, 0) / 1000,
    annualSolarKWh: solarGain.reduce((sum, v) => sum + v, 0) / 1000,
  };
}

export function facadeAreas(building, wwr) {
  const height = building.floorHeight;
  const gross = {
    south: building.width * height,
    north: building.width * height,
    east: building.depth * height,
    west: building.depth * height,
  };
  const result = {};
  for (const orientation of Object.keys(gross)) {
    const windowArea = gross[orientation] * wwr;
    result[orientation] = {
      gross: gross[orientation],
      window: windowArea,
      opaque: gross[orientation] - windowArea,
    };
  }
  return result;
}

export const DEFAULT_COMFORT = COMFORT;
