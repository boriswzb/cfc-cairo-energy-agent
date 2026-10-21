import { parseWeatherCsv, parseWeatherMetadata, simulateBuilding } from '@cfc/energy-core';
import { optimizeEnvelope } from '@cfc/optimizer';

let cachedWeather = null;
let cachedMetadata = null;
let cachedBaseline = null;

function pruneResult(result) {
  if (!result) return null;
  return {
    ...result,
    weather: undefined,
    solar: undefined,
    occupied: undefined,
    pv: {
      ...result.pv,
      hourly: undefined,
    },
  };
}

function pruneOptimization(optimization) {
  return {
    ...optimization,
    baseline: pruneResult(optimization.baseline),
    recommended: pruneResult(optimization.recommended),
    fast: {
      ...optimization.fast,
      baseline: optimization.fast.baseline,
      recommended: optimization.fast.recommended,
      candidates: optimization.fast.candidates.map((point) => ({
        ...point,
        design: { ...point.design },
      })),
      topCandidates: optimization.fast.topCandidates.map((point) => ({
        ...point,
        design: { ...point.design },
      })),
    },
  };
}

async function loadData() {
  if (cachedWeather && cachedMetadata) return;
  const [csv, meta] = await Promise.all([
    fetch('/data/cairo_hourly.csv').then((response) => {
      if (!response.ok) throw new Error('无法加载开罗逐时气象 CSV');
      return response.text();
    }),
    fetch('/data/weather-metadata.json').then((response) => {
      if (!response.ok) throw new Error('无法加载气象元数据');
      return response.json();
    }),
  ]);
  cachedWeather = parseWeatherCsv(csv);
  cachedMetadata = parseWeatherMetadata(meta);
}

function postProgress(progress) {
  self.postMessage({ type: 'progress', ...progress });
}

async function runOptimization() {
  await loadData();
  postProgress({ phase: 'baseline', completed: 0, total: 1, message: '计算基准方案 8,760 小时负荷…' });
  if (!cachedBaseline) {
    cachedBaseline = simulateBuilding({ weather: cachedWeather, metadata: cachedMetadata });
  }
  self.postMessage({ type: 'baseline', baseline: pruneResult(cachedBaseline), metadata: cachedMetadata });
  const optimization = await optimizeEnvelope({
    weather: cachedWeather,
    metadata: cachedMetadata,
    baseline: cachedBaseline,
    onProgress: postProgress,
  });
  self.postMessage({ type: 'done', optimization: pruneOptimization(optimization) });
}

async function evaluateDesign(design) {
  await loadData();
  if (!cachedBaseline) {
    cachedBaseline = simulateBuilding({ weather: cachedWeather, metadata: cachedMetadata });
  }
  const result = simulateBuilding({
    weather: cachedWeather,
    metadata: cachedMetadata,
    designInput: design,
  });
  self.postMessage({ type: 'evaluated', result: pruneResult(result), design });
}

self.onmessage = async (event) => {
  const { type } = event.data ?? {};
  try {
    if (type === 'run') {
      await runOptimization();
    } else if (type === 'evaluate') {
      await evaluateDesign(event.data.design);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : '',
    });
  }
};
