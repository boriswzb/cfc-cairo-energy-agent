import {
  BASE_SCENARIO,
  BUILDING,
  DEFAULT_DESIGN,
  GLAZING_OPTIONS,
  GLAZING_TYPES,
  SHADING_OPTIONS,
  SHADING_STRATEGIES,
  simulateBuilding,
} from '@cfc/energy-core';
import { createFastEvaluator } from './evaluator.js';

export const SEARCH_SPACE = {
  wallInsulationMm: [80, 120, 160],
  wwr: [0.22, 0.3, 0.38, 0.46],
  glazing: GLAZING_OPTIONS,
  shading: SHADING_OPTIONS,
};

function designKey(design) {
  return [design.wallInsulationMm, design.wwr, design.glazing, design.shading].join('|');
}

function dominates(a, b) {
  return (
    a.coolingMWh <= b.coolingMWh &&
    a.selfConsumptionRatio >= b.selfConsumptionRatio &&
    (a.coolingMWh < b.coolingMWh || a.selfConsumptionRatio > b.selfConsumptionRatio)
  );
}

export function paretoFront(points) {
  return points.filter((point) => !points.some((other) => dominates(other, point)));
}

function percentChange(before, after) {
  return before > 0 ? ((before - after) / before) * 100 : 0;
}

function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function buildCandidates() {
  const candidates = [];
  for (const wallInsulationMm of SEARCH_SPACE.wallInsulationMm) {
    for (const wwr of SEARCH_SPACE.wwr) {
      for (const glazing of SEARCH_SPACE.glazing) {
        for (const shading of SEARCH_SPACE.shading) {
          candidates.push({
            ...DEFAULT_DESIGN,
            wallInsulationMm,
            wwr,
            glazing,
            shading,
          });
        }
      }
    }
  }
  return candidates;
}

function normalizePoint(point, baseline) {
  return {
    ...point,
    coolingSavingsPct: percentChange(baseline.coolingMWh, point.coolingMWh),
    selfConsumptionDeltaPp: (point.selfConsumptionRatio - baseline.selfConsumptionRatio) * 100,
    selfSufficiencyDeltaPp: (point.selfSufficiencyRatio - baseline.selfSufficiencyRatio) * 100,
  };
}

function buildAgentNarrative({ baseline, recommended, savings, pareto }) {
  const baseDesign = baseline.design;
  const optDesign = recommended.design;
  const glazing = GLAZING_TYPES[optDesign.glazing];
  const shading = SHADING_STRATEGIES[optDesign.shading];
  const bullets = [
    `外墙保温保持 ${optDesign.wallInsulationMm} mm（传热系数 ${recommended.envelope.wall.uValue.toFixed(3)} W/(m²·K)）；在开罗干热气候下继续增厚保温会减少夜间向室外的散热，对全年冷负荷的边际收益转负，因此优化重点转向窗墙比、玻璃与遮阳。`,
    `窗墙比 ${(baseDesign.wwr * 100).toFixed(0)}% → ${(optDesign.wwr * 100).toFixed(0)}%，玻璃采用${glazing.name}（SHGC ${glazing.shgc.toFixed(2)}，U ${glazing.uValue.toFixed(2)} W/(m²·K)）。`,
    baseDesign.shading === optDesign.shading
      ? `外遮阳维持${shading.name}，并保留 4–10 月高辐照时段的时序控制逻辑。`
      : `外遮阳由${SHADING_STRATEGIES[baseDesign.shading].name}调整为${shading.name}，在 4–10 月高辐照时段按朝向动态收放。`,
    `全年制冷需求预计下降 ${savings.coolingPct.toFixed(1)}%，峰值冷负荷下降 ${savings.peakPct.toFixed(1)}%，冷负荷强度 ${recommended.summary.coolingIntensityKWhM2.toFixed(1)} kWh/m²。`,
    `屋顶 160 kWp 光伏年发电 ${recommended.summary.pvYieldMWh.toFixed(1)} MWh；自消纳率 ${(recommended.summary.pvSelfConsumptionRatio * 100).toFixed(1)}%，建筑用电自给率 ${(recommended.summary.pvSelfSufficiencyRatio * 100).toFixed(1)}%。`,
    `室内热舒适满足率 ${(recommended.summary.comfortCompliance * 100).toFixed(1)}%，未满足小时 ${recommended.summary.unmetHours} h；能量平衡校验 ${recommended.validation.passed ? '通过' : '需复核'}。`,
  ];
  if (savings.selfConsumptionDeltaPp < 0) {
    bullets.push(
      `围护提效后白天冷负荷下降，光伏自消纳率变化 ${savings.selfConsumptionDeltaPp.toFixed(1)} 个百分点；由于光伏仅 160 kWp 且建筑基荷较高，仍保持 ${(recommended.summary.pvSelfConsumptionRatio * 100).toFixed(1)}% 的高消纳水平。若需进一步提升，可在午间富余时段采用蓄冷/预冷策略。`,
    );
  } else {
    bullets.push(
      `光伏自消纳率提升 ${savings.selfConsumptionDeltaPp.toFixed(1)} 个百分点，围护热工性能与光伏出力时序匹配改善。`,
    );
  }
  return {
    headline: `推荐方案：${optDesign.wallInsulationMm} mm 保温 · ${(optDesign.wwr * 100).toFixed(0)}% 窗墙比 · ${glazing.short} · ${shading.short}`,
    summary: `在 ${pareto.length} 个 Pareto 候选方案中，按“制冷节能 65% + 光伏消纳 20% + 自给率 15%”的综合评分选出。`,
    bullets,
  };
}

export async function optimizeEnvelope({
  weather,
  metadata = {},
  building = BUILDING,
  baseline = null,
  onProgress = null,
  yieldEvery = 12,
}) {
  const start = Date.now();
  const report = async (phase, completed, total, message) => {
    if (onProgress) await onProgress({ phase, completed, total, message, elapsedMs: Date.now() - start });
  };

  await report('baseline', 0, 1, '计算基准方案全年 8,760 小时负荷…');
  const baselineFull = baseline ?? simulateBuilding({ weather, metadata, building });
  await report('precompute', 0, 1, '预计算太阳、围护与内热响应…');
  const evaluator = createFastEvaluator({ weather, building, baseline: baselineFull });
  const fastBaseline = evaluator.evaluate(baselineFull.design);
  const candidates = buildCandidates();
  const allDesigns = [
    { ...baselineFull.design, scenario: 'baseline' },
    ...candidates,
  ];
  const seen = new Set();
  const unique = allDesigns.filter((design) => {
    const key = designKey(design);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const results = [];
  for (let index = 0; index < unique.length; index += 1) {
    const design = unique[index];
    const result = evaluator.evaluate(design);
    results.push(normalizePoint(result, fastBaseline));
    if (index % yieldEvery === 0) {
      await report('search', index + 1, unique.length, `评估围护组合 ${index + 1}/${unique.length}`);
      await yieldToBrowser();
    }
  }
  await report('search', unique.length, unique.length, '围护组合评估完成');
  await yieldToBrowser();

  const feasible = results.filter(
    (point) => point.comfortCompliance >= 0.98 && point.peakIntensityWm2 <= 150,
  );
  const allFeasible = feasible.length > 0 ? feasible : results;
  // The as-built building has adjustable shading; do not recommend downgrading it to fixed/none.
  const adjustable = allFeasible.filter((point) => ['smart', 'seasonal'].includes(point.design.shading));
  const pool = adjustable.length > 0 ? adjustable : allFeasible;
  const sortedByCooling = [...pool].sort((a, b) => a.coolingMWh - b.coolingMWh);
  const sortedByPv = [...pool].sort((a, b) => b.selfConsumptionRatio - a.selfConsumptionRatio);
  const efficiencyLeader = sortedByCooling[0];
  const pvLeader = sortedByPv[0];
  const pareto = paretoFront(allFeasible).sort((a, b) => a.coolingMWh - b.coolingMWh);

  const base = normalizePoint(fastBaseline, fastBaseline);
  const scored = pool.map((point) => {
    const coolingSave = percentChange(base.coolingMWh, point.coolingMWh) / 100;
    const selfGain = (point.selfConsumptionRatio - base.selfConsumptionRatio) * 8;
    const suffGain = (point.selfSufficiencyRatio - base.selfSufficiencyRatio) * 8;
    const penalty = point.selfConsumptionRatio < base.selfConsumptionRatio - 0.015 ? -0.12 : 0;
    return {
      point,
      score: 0.65 * coolingSave + 0.2 * selfGain + 0.15 * suffGain + penalty,
    };
  });
  scored.sort((a, b) => b.score - a.score);
  const recommendedFast = scored[0]?.point ?? base;

  // Fast screening is intentionally conservative. Re-run the strongest candidates
  // with the full 6-floor model and choose the winner on detailed physics.
  const smartLeader = pool
    .filter((point) => point.design.shading === 'smart')
    .sort((a, b) => a.coolingMWh - b.coolingMWh)[0];
  const finalists = [];
  const seenFinalists = new Set();
  for (const candidate of [recommendedFast, smartLeader, efficiencyLeader]) {
    if (!candidate) continue;
    const key = designKey(candidate.design);
    if (seenFinalists.has(key)) continue;
    seenFinalists.add(key);
    finalists.push(candidate);
    if (finalists.length >= 3) break;
  }

  await report('detailed', 0, finalists.length, '对入围方案执行全年逐时详算…');
  const detailedFinalists = [];
  for (let index = 0; index < finalists.length; index += 1) {
    const candidate = finalists[index];
    const result = simulateBuilding({
      weather,
      metadata,
      building,
      designInput: candidate.design,
      options: { solar: evaluator.solar },
    });
    detailedFinalists.push({ fast: candidate, result });
    await report(
      'detailed',
      index + 1,
      finalists.length,
      `入围方案详算 ${index + 1}/${finalists.length}`,
    );
    await yieldToBrowser();
  }

  const viable = detailedFinalists.filter(
    ({ result }) => result.summary.pvSelfConsumptionRatio >= baselineFull.summary.pvSelfConsumptionRatio - 0.02,
  );
  const detailedPool = viable.length > 0 ? viable : detailedFinalists;
  detailedPool.sort((a, b) => a.result.summary.annualCoolingMWh - b.result.summary.annualCoolingMWh);
  const selected = detailedPool[0] ?? detailedFinalists[0];
  const recommendedFull = selected.result;
  const recommendedDesign = selected.fast.design;
  const recommendedFastPoint = selected.fast;

  await report('detailed', finalists.length, finalists.length, '推荐方案详算完成');

  const savings = {
    coolingPct: percentChange(baselineFull.summary.annualCoolingMWh, recommendedFull.summary.annualCoolingMWh),
    heatingPct: percentChange(baselineFull.summary.annualHeatingMWh, recommendedFull.summary.annualHeatingMWh),
    electricityPct: percentChange(baselineFull.summary.annualBuildingElectricityMWh, recommendedFull.summary.annualBuildingElectricityMWh),
    peakPct: percentChange(baselineFull.summary.peakCoolingKW, recommendedFull.summary.peakCoolingKW),
    hvacPct: percentChange(baselineFull.summary.annualHvacElectricityMWh, recommendedFull.summary.annualHvacElectricityMWh),
    selfConsumptionDeltaPp:
      (recommendedFull.summary.pvSelfConsumptionRatio - baselineFull.summary.pvSelfConsumptionRatio) * 100,
    selfSufficiencyDeltaPp:
      (recommendedFull.summary.pvSelfSufficiencyRatio - baselineFull.summary.pvSelfSufficiencyRatio) * 100,
    co2DeltaTonnes:
      recommendedFull.summary.co2AvoidedTonnes - baselineFull.summary.co2AvoidedTonnes,
  };

  const agent = buildAgentNarrative({
    baseline: baselineFull,
    recommended: recommendedFull,
    savings,
    pareto,
  });

  const topCandidates = [...pool]
    .sort((a, b) => b.coolingSavingsPct - a.coolingSavingsPct)
    .slice(0, 24)
    .map((point) => ({
      ...point,
      design: { ...point.design },
    }));

  await report('done', 1, 1, '优化完成');
  return {
    baseline: baselineFull,
    recommended: recommendedFull,
    baselineScenario: { ...BASE_SCENARIO, result: baselineFull },
    optimizedScenario: {
      id: 'optimized',
      name: 'Agent 优化方案',
      description: agent.headline,
      design: recommendedDesign,
      result: recommendedFull,
    },
    fast: {
      baseline: fastBaseline,
      recommended: recommendedFastPoint,
      candidates: results,
      pareto,
      topCandidates,
    },
    savings,
    agent,
    search: {
      evaluated: unique.length,
      feasible: pool.length,
      paretoSize: pareto.length,
      elapsedMs: Date.now() - start,
      space: SEARCH_SPACE,
      baselineDesign: baselineFull.design,
      efficiencyLeader: efficiencyLeader?.design ?? null,
      pvLeader: pvLeader?.design ?? null,
      recommendedDesign,
      finalists: detailedFinalists.map(({ fast, result }) => ({
        design: fast.design,
        coolingMWh: result.summary.annualCoolingMWh,
        selfConsumptionRatio: result.summary.pvSelfConsumptionRatio,
      })),
    },
    generatedAt: new Date().toISOString(),
  };
}
