import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BUILDING,
  COMFORT,
  auditEnergyBalance,
  calibrateEnvelope,
  parseWeatherCsv,
  parseWeatherMetadata,
  roofAssembly,
  simulateBuilding,
  solarPosition,
  ventilationLoad,
  wallAssembly,
  windowForOrientation,
  buildSolarSeries,
} from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const weather = parseWeatherCsv(fs.readFileSync(path.join(root, 'data/cairo_hourly.csv'), 'utf8'));
const metadata = parseWeatherMetadata(fs.readFileSync(path.join(root, 'data/weather-metadata.json'), 'utf8'));

let baselineCache = null;
function baseline() {
  if (!baselineCache) {
    baselineCache = simulateBuilding({ weather, metadata });
  }
  return baselineCache;
}

test('天气：Cairo TMYx 为 8760 小时，温度与辐射范围合理', () => {
  assert.equal(weather.length, 8760);
  const maxT = Math.max(...weather.map((row) => row.tdb));
  const minT = Math.min(...weather.map((row) => row.tdb));
  assert.ok(maxT > 40 && maxT < 50, `max T ${maxT}`);
  assert.ok(minT > 0 && minT < 15, `min T ${minT}`);
  assert.ok(weather.reduce((sum, row) => sum + row.ghi, 0) > 2_000_000);
  assert.equal(metadata.records, 8760);
  assert.ok(metadata.source.includes('Climate.OneBuilding'));
});

test('太阳位置与坡面辐射：正午高度角与夜间零辐射', () => {
  const noon = solarPosition(172, 12, 30.122, 31.406, 2);
  assert.ok(noon.altitudeDeg > 70 && noon.altitudeDeg < 90, `noon altitude ${noon.altitudeDeg}`);
  assert.ok(noon.azimuthDeg > 130 && noon.azimuthDeg < 230);
  const midnight = solarPosition(172, 0, 30.122, 31.406, 2);
  assert.ok(midnight.altitudeDeg < 0);
  const solar = buildSolarSeries(weather, {
    latitude: 30.122,
    longitude: 31.406,
    timezone: 2,
    albedo: 0.2,
  });
  assert.ok(solar.some((row) => row.poa.south > 0));
  const night = solar.filter((_, index) => index % 24 < 5);
  assert.ok(night.every((row) => row.poa.south === 0 && row.poa.north === 0));
});

test('围护结构：墙体与屋面 U 值满足节能围护水平', () => {
  const wall = wallAssembly(80);
  const roof = roofAssembly(100);
  assert.ok(wall.uValue > 0.3 && wall.uValue < 0.5, `wall U ${wall.uValue}`);
  assert.ok(roof.uValue > 0.2 && roof.uValue < 0.4, `roof U ${roof.uValue}`);
  assert.ok(wallAssembly(160).uValue < wallAssembly(40).uValue);
});

test('3R2C 稳态：47.2 °C 极端工况下与 U·ΔT 偏差小于 1%', () => {
  const calibration = calibrateEnvelope({ wall: wallAssembly(80), roof: roofAssembly(100) });
  assert.ok(calibration.wallErrorPct < 1, `wall error ${calibration.wallErrorPct}`);
  assert.ok(calibration.roofErrorPct < 1, `roof error ${calibration.roofErrorPct}`);
  assert.equal(calibration.wallFactor, 1);
  assert.equal(calibration.roofFactor, 1);
  assert.equal(calibration.extreme.outdoorC, 47.2);
});

test('全年负荷：冷负荷占主导，Openlab 独立计量，能量平衡通过', () => {
  const result = baseline();
  assert.ok(result.summary.annualCoolingMWh > 800, `cooling ${result.summary.annualCoolingMWh}`);
  assert.ok(result.summary.annualCoolingMWh < 1800, `cooling ${result.summary.annualCoolingMWh}`);
  assert.ok(result.summary.annualHeatingMWh < result.summary.annualCoolingMWh * 0.15);
  assert.ok(result.summary.coolingShare > 0.8);
  assert.ok(result.summary.peakCoolingKW > 300 && result.summary.peakCoolingKW < 900);
  assert.ok(result.summary.comfortCompliance >= COMFORT.minComfortCompliance);
  assert.ok(result.openlab.coolingMWh > 80);
  assert.ok(result.openlab.components.it > 100);
  assert.ok(result.summary.openlabShare > 0.05);
  assert.equal(result.validation.passed, true);
  assert.ok(result.validation.energyBalanceErrorPct < 0.01);
  assert.equal(result.validation.corrected, false);
  const expected = result.summary.annualCoolingMWh - result.summary.annualHeatingMWh;
  assert.ok(Math.abs(result.components.total - expected) < 1e-6);
});

test('分项负荷：外墙、屋面、外窗、遮阳、内热、新风均有独立结果', () => {
  const result = baseline();
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
  ]) {
    assert.ok(Number.isFinite(result.components[key]), `${key} missing`);
  }
  assert.ok(result.components.solar > 100);
  assert.ok(result.components.equipment > 150);
  assert.ok(result.components.wall < 0);
  assert.ok(result.envelope.shading);
});

test('光伏：容量、发电量、自消纳与建筑用电匹配合理', () => {
  const result = baseline();
  assert.equal(result.pv.capacityKWp, 160);
  assert.ok(result.pv.annual.yieldMWh > 220 && result.pv.annual.yieldMWh < 360);
  assert.ok(result.pv.annual.selfConsumptionRatio > 0.75 && result.pv.annual.selfConsumptionRatio <= 1);
  assert.ok(result.pv.annual.selfSufficiencyRatio > 0.15 && result.pv.annual.selfSufficiencyRatio < 0.5);
  assert.equal(result.pv.julyProfile.length, 24);
  assert.ok(result.pv.julyProfile.some((slot) => slot.pv > 20));
  assert.ok(result.pv.julyProfile.every((slot) => slot.demand >= 0));
});

test('新风负荷：干热空气以显热为主，含湿量计算稳定', () => {
  const load = ventilationLoad({
    flowM3s: 1,
    tOut: 42,
    rhOut: 0.2,
    tIn: 24,
    rhIn: 0.5,
    pressure: 101000,
    sensibleRecovery: 0,
  });
  assert.ok(load.sensible > 15 && load.sensible < 30);
  assert.ok(load.latent > 0);
  assert.ok(Number.isFinite(load.wOut));
});

test('能量平衡守卫：偏差超过 5% 时自动修正分项', () => {
  const malicious = {
    total: 100,
    solar: 90,
    wall: 10,
    roof: 0,
    windowConduction: 0,
    peopleSensible: 0,
    peopleLatent: 0,
    lighting: 0,
    equipment: 0,
    ventilationSensible: 0,
    ventilationLatent: 0,
    infiltrationSensible: 0,
    infiltrationLatent: 0,
  };
  const audit = auditEnergyBalance({
    components: malicious,
    annualCoolingMWh: 120,
    annualHeatingMWh: 10,
    calibration: { corrections: [] },
  });
  assert.equal(audit.corrected, true);
  assert.equal(audit.energyBalanceErrorPct, 0);
  assert.ok(audit.corrections.some((item) => item.component === '分项能量平衡'));
});

test('建筑空间：6 层、各层面积一致、Openlab 位于 1F', () => {
  assert.equal(BUILDING.floors.length, 6);
  for (const floor of BUILDING.floors) {
    assert.ok(Math.abs(floor.area - 1215) < 0.1, `${floor.level}F area ${floor.area}`);
  }
  const lab = BUILDING.floors[1].zones.find((zone) => zone.type === 'openlab');
  assert.ok(lab);
  assert.equal(lab.area, 90);
  assert.equal(BUILDING.floors[1].zones.filter((zone) => zone.type === 'core').length, 1);
});

test('外窗：Low-E 与三玻 Low-E 的传热/太阳得热差异正确', () => {
  const lowE = windowForOrientation({
    weather: weather.slice(0, 48),
    solar: buildSolarSeries(weather.slice(0, 48), {
      latitude: 30.122,
      longitude: 31.406,
      timezone: 2,
    }),
    glazingId: 'low_e_double',
    area: 100,
    indoorTemps: new Float64Array(48).fill(24),
    shadingStrategy: 'smart',
    orientation: 'south',
  });
  const triple = windowForOrientation({
    weather: weather.slice(0, 48),
    solar: buildSolarSeries(weather.slice(0, 48), {
      latitude: 30.122,
      longitude: 31.406,
      timezone: 2,
    }),
    glazingId: 'low_e_triple',
    area: 100,
    indoorTemps: new Float64Array(48).fill(24),
    shadingStrategy: 'smart',
    orientation: 'south',
  });
  assert.ok(Math.abs(triple.annualSolarKWh) < Math.abs(lowE.annualSolarKWh));
});
