import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWeatherCsv, parseWeatherMetadata, simulateBuilding } from '@cfc/energy-core';
import { optimizeEnvelope, paretoFront } from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const weather = parseWeatherCsv(fs.readFileSync(path.join(root, 'data/cairo_hourly.csv'), 'utf8'));
const metadata = parseWeatherMetadata(fs.readFileSync(path.join(root, 'data/weather-metadata.json'), 'utf8'));
const baseline = simulateBuilding({ weather, metadata });

test('Pareto：支配关系与前沿筛选正确', () => {
  const points = [
    { id: 'a', coolingMWh: 100, selfConsumptionRatio: 0.9 },
    { id: 'b', coolingMWh: 110, selfConsumptionRatio: 0.95 },
    { id: 'c', coolingMWh: 120, selfConsumptionRatio: 0.85 },
    { id: 'd', coolingMWh: 100, selfConsumptionRatio: 0.88 },
  ];
  const front = paretoFront(points);
  assert.deepEqual(front.map((point) => point.id).sort(), ['a', 'b']);
});

test('优化：搜索可调遮阳方案，并给出可复算的节能结果', async () => {
  const progress = [];
  const result = await optimizeEnvelope({
    weather,
    metadata,
    baseline,
    yieldEvery: 48,
    onProgress: (item) => progress.push(item.phase),
  });
  assert.ok(result.search.evaluated >= 100);
  assert.ok(result.search.paretoSize > 0);
  assert.ok(['smart', 'seasonal'].includes(result.search.recommendedDesign.shading));
  assert.ok(result.recommended.summary.annualCoolingMWh < baseline.summary.annualCoolingMWh);
  assert.ok(result.savings.coolingPct > 3);
  assert.ok(result.savings.peakPct > 0);
  assert.ok(result.recommended.summary.pvSelfConsumptionRatio > 0.85);
  assert.ok(result.recommended.summary.pvSelfSufficiencyRatio >= baseline.summary.pvSelfSufficiencyRatio - 0.005);
  assert.equal(result.recommended.validation.passed, true);
  assert.ok(result.agent.bullets.length >= 5);
  assert.ok(progress.includes('search') && progress.includes('detailed') && progress.includes('done'));
  assert.equal(result.search.evaluated, 192);
  assert.ok(result.fast.pareto.length > 0);
  assert.ok(result.recommended.design.wallInsulationMm >= 80);
});

test('优化：入围详算方案位于可调遮阳搜索空间', async () => {
  const result = await optimizeEnvelope({ weather, metadata, baseline });
  assert.ok(result.search.finalists.length >= 1);
  for (const finalist of result.search.finalists) {
    assert.ok(['smart', 'seasonal'].includes(finalist.design.shading));
    assert.ok([80, 120, 160].includes(finalist.design.wallInsulationMm));
    assert.ok(Number.isFinite(finalist.coolingMWh));
  }
});
