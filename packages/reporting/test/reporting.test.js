import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWeatherCsv, parseWeatherMetadata, simulateBuilding } from '@cfc/energy-core';
import {
  buildMarkdownReport,
  comparisonCsv,
  hourlyCsv,
  monthlyCsv,
  renderHourlyCurve,
  renderMonthlyComparison,
  renderPareto,
  renderPvMatching,
} from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const weather = parseWeatherCsv(fs.readFileSync(path.join(root, 'data/cairo_hourly.csv'), 'utf8'));
const metadata = parseWeatherMetadata(fs.readFileSync(path.join(root, 'data/weather-metadata.json'), 'utf8'));
const baseline = simulateBuilding({ weather, metadata });
const optimized = {
  ...baseline,
  summary: {
    ...baseline.summary,
    annualCoolingMWh: baseline.summary.annualCoolingMWh * 0.9,
    annualBuildingElectricityMWh: baseline.summary.annualBuildingElectricityMWh * 0.97,
    peakCoolingKW: baseline.summary.peakCoolingKW * 0.92,
  },
  monthly: baseline.monthly.map((month) => ({ ...month, coolingMWh: month.coolingMWh * 0.9 })),
};
const savings = {
  coolingPct: 10,
  heatingPct: 2,
  electricityPct: 3,
  peakPct: 8,
  selfConsumptionDeltaPp: -1.2,
  selfSufficiencyDeltaPp: 0.4,
};
const agent = {
  headline: '推荐方案：80 mm 保温 · 22% 窗墙比',
  bullets: ['窗墙比降低', '遮阳升级', '制冷下降'],
};

test('CSV：逐时、逐月、方案对比表头与行数正确', () => {
  const hourly = hourlyCsv(baseline);
  assert.equal(hourly.trim().split('\n').length, 8761);
  assert.ok(hourly.startsWith('timestamp,outdoor_C'));
  const monthly = monthlyCsv(baseline);
  assert.equal(monthly.trim().split('\n').length, 13);
  const comparison = comparisonCsv({ baseline, optimized, savings });
  assert.ok(comparison.includes('annual_cooling_MWh'));
  assert.ok(comparison.includes('baseline'));
});

test('Markdown：包含摘要、逐月表、Openlab 与校验章节', () => {
  const markdown = buildMarkdownReport({
    baseline,
    optimized,
    savings,
    agent,
    metadata,
    search: { evaluated: 192, paretoSize: 45, elapsedMs: 4800 },
    generatedAt: new Date('2026-10-21T12:00:00Z'),
  });
  assert.ok(markdown.startsWith('# 华为埃及开罗 CFC 办公楼'));
  for (const heading of ['## 1. 结论摘要', '## 5. 逐月冷热负荷', '## 7. Openlab 机房热负荷', '## 8. 光伏发电与建筑用电匹配', '## 9. 计算校验']) {
    assert.ok(markdown.includes(heading), `missing ${heading}`);
  }
  assert.ok(markdown.includes('160 kWp'));
  assert.ok(markdown.includes('能量平衡'));
});

test('PNG：四类图表均可由 Node 生成有效 PNG', () => {
  const charts = [
    renderHourlyCurve({ baseline, optimized, width: 900, height: 400 }),
    renderMonthlyComparison({ baseline, optimized, width: 900, height: 400 }),
    renderPvMatching({ result: baseline, width: 900, height: 400 }),
    renderPareto({
      points: [
        { coolingMWh: 1100, selfConsumptionRatio: 0.92 },
        { coolingMWh: 1200, selfConsumptionRatio: 0.94 },
      ],
      baseline,
      recommended: optimized,
      width: 900,
      height: 400,
    }),
  ];
  for (const buffer of charts) {
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 5000);
    assert.deepEqual([...buffer.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
});
