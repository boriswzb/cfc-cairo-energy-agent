import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWeatherCsv, parseWeatherMetadata, simulateBuilding } from '@cfc/energy-core';
import { optimizeEnvelope } from '@cfc/optimizer';
import {
  buildMarkdownReport,
  comparisonCsv,
  floorCsv,
  hourlyCsv,
  monthlyCsv,
  openlabComponentsCsv,
  openlabCsv,
  renderHourlyCurve,
  renderMonthlyComparison,
  renderPareto,
  renderPvMatching,
} from '@cfc/reporting';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reports = path.join(root, 'reports');
fs.mkdirSync(reports, { recursive: true });

const weather = parseWeatherCsv(fs.readFileSync(path.join(root, 'data/cairo_hourly.csv'), 'utf8'));
const metadata = parseWeatherMetadata(fs.readFileSync(path.join(root, 'data/weather-metadata.json'), 'utf8'));
console.log('Running baseline annual simulation…');
const baseline = simulateBuilding({ weather, metadata });
console.log('Optimizing envelope…');
const optimized = await optimizeEnvelope({
  weather,
  metadata,
  baseline,
  onProgress: (progress) => {
    if (progress.phase !== 'search' || progress.completed % 48 === 0) {
      console.log(`  [${progress.phase}] ${progress.completed}/${progress.total} ${progress.message}`);
    }
  },
});

const write = (name, content) => {
  fs.writeFileSync(path.join(reports, name), content);
  console.log(`  wrote ${name}`);
};

write('cfc-hourly.csv', hourlyCsv(optimized.recommended));
write('cfc-monthly.csv', monthlyCsv(optimized.recommended));
write('cfc-openlab-monthly.csv', openlabCsv(optimized.recommended));
write('cfc-openlab-components.csv', openlabComponentsCsv(optimized.recommended));
write('cfc-floors.csv', floorCsv(optimized.recommended));
write(
  'cfc-scenario-comparison.csv',
  comparisonCsv({
    baseline: optimized.baseline,
    optimized: optimized.recommended,
    savings: optimized.savings,
  }),
);
write(
  'CFC-Cairo-analysis.md',
  buildMarkdownReport({
    baseline: optimized.baseline,
    optimized: optimized.recommended,
    savings: optimized.savings,
    agent: optimized.agent,
    metadata,
    search: optimized.search,
    generatedAt: new Date(),
  }),
);

write(
  'cfc-annual-hourly.png',
  renderHourlyCurve({ baseline: optimized.baseline, optimized: optimized.recommended }),
);
write(
  'cfc-monthly-comparison.png',
  renderMonthlyComparison({ baseline: optimized.baseline, optimized: optimized.recommended }),
);
write('cfc-pv-matching.png', renderPvMatching({ result: optimized.recommended }));
write(
  'cfc-pareto.png',
  renderPareto({
    points: optimized.fast.candidates,
    baseline: optimized.baseline,
    recommended: optimized.recommended,
  }),
);

console.log('');
console.log(`Report generated in ${reports}`);
console.log(
  `Cooling ${optimized.baseline.summary.annualCoolingMWh.toFixed(1)} → ${optimized.recommended.summary.annualCoolingMWh.toFixed(1)} MWh (${optimized.savings.coolingPct.toFixed(1)}% saving)`,
);
