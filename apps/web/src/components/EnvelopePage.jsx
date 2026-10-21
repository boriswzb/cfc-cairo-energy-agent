import React from 'react';
import {
  GLAZING_OPTIONS,
  GLAZING_TYPES,
  SHADING_OPTIONS,
  SHADING_STRATEGIES,
} from '@cfc/energy-core';
import { Icon } from './Icons.jsx';
import { ParetoChart } from '../charts/ParetoChart.jsx';
import { formatNumber, formatPercent, formatSignedPp } from '../lib/format.js';

function deltaPct(base, value) {
  return base > 0 ? ((base - value) / base) * 100 : 0;
}

export function EnvelopePage({
  optimization,
  result,
  design,
  onDesignChange,
  onApply,
  evaluating,
  onOptimize,
  optimizing,
  progress,
  onPickCandidate,
}) {
  const baseline = optimization.baseline;
  const recommended = optimization.recommended;
  const isRecommended =
    design.wallInsulationMm === recommended.design.wallInsulationMm &&
    design.wwr === recommended.design.wwr &&
    design.glazing === recommended.design.glazing &&
    design.shading === recommended.design.shading;
  const coolingDelta = deltaPct(baseline.summary.annualCoolingMWh, result.summary.annualCoolingMWh);
  const peakDelta = deltaPct(baseline.summary.peakCoolingKW, result.summary.peakCoolingKW);
  const electricDelta = deltaPct(
    baseline.summary.annualBuildingElectricityMWh,
    result.summary.annualBuildingElectricityMWh,
  );

  return (
    <div className="page envelope-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow"><Icon name="layers" size={13} /> ENVELOPE OPTIMIZATION</span>
          <h1>围护结构多目标优化</h1>
          <p>在埃及本地热舒适约束下，搜索保温、窗墙比、玻璃与可调遮阳组合，最小化制冷需求并维持光伏高消纳。</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="btn ghost" onClick={onOptimize} disabled={optimizing}>
            <Icon name="refresh" size={16} className={optimizing ? 'spin' : ''} />
            {optimizing ? 'Agent 搜索中…' : '运行 192 组合优化'}
          </button>
        </div>
      </header>

      {optimizing && (
        <div className="optimization-progress">
          <div className="optimization-progress-head">
            <span><Icon name="sparkles" size={15} /> {progress.message ?? '正在优化…'}</span>
            <b>{progress.total ? `${progress.completed}/${progress.total}` : '—'}</b>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 12}%` }} />
          </div>
        </div>
      )}

      <div className="envelope-top">
        <section className="control-card">
          <div className="control-head">
            <div>
              <span className="eyebrow">DESIGN VARIABLES</span>
              <h3>方案变量</h3>
            </div>
            {isRecommended ? <span className="tag green">Agent 推荐</span> : <span className="tag">自定义方案</span>}
          </div>

          <label className="design-control">
            <div><span>外墙保温厚度</span><b>{design.wallInsulationMm} mm</b></div>
            <input
              type="range"
              min="80"
              max="160"
              step="40"
              value={design.wallInsulationMm}
              onChange={(event) => onDesignChange({ ...design, wallInsulationMm: Number(event.target.value) })}
            />
            <div className="range-labels"><span>80 mm</span><span>120 mm</span><span>160 mm</span></div>
          </label>

          <label className="design-control">
            <div><span>窗墙比 WWR</span><b>{formatPercent(design.wwr, 0)}</b></div>
            <input
              type="range"
              min="0.22"
              max="0.46"
              step="0.08"
              value={design.wwr}
              onChange={(event) => onDesignChange({ ...design, wwr: Number(event.target.value) })}
            />
            <div className="range-labels"><span>22%</span><span>34%</span><span>46%</span></div>
          </label>

          <label className="design-control">
            <div><span>玻璃选型</span><b>{GLAZING_TYPES[design.glazing].short}</b></div>
            <select
              value={design.glazing}
              onChange={(event) => onDesignChange({ ...design, glazing: event.target.value })}
            >
              {GLAZING_OPTIONS.map((id) => (
                <option key={id} value={id}>{GLAZING_TYPES[id].name} · U {GLAZING_TYPES[id].uValue}</option>
              ))}
            </select>
          </label>

          <label className="design-control">
            <div><span>遮阳控制策略</span><b>{SHADING_STRATEGIES[design.shading].short}</b></div>
            <select
              value={design.shading}
              onChange={(event) => onDesignChange({ ...design, shading: event.target.value })}
            >
              {SHADING_OPTIONS.map((id) => (
                <option key={id} value={id}>{SHADING_STRATEGIES[id].name}</option>
              ))}
            </select>
            {!['smart', 'seasonal'].includes(design.shading) && (
              <span className="inline-warning"><Icon name="alert" size={12} /> 既定条件要求可调外遮阳</span>
            )}
          </label>

          <div className="constraint-row">
            <span className={result.summary.comfortCompliance >= 0.98 ? 'constraint ok' : 'constraint bad'}>
              <Icon name="check" size={12} /> 舒适 {formatPercent(result.summary.comfortCompliance, 1)}
            </span>
            <span className={result.summary.peakCoolingIntensityWm2 <= 150 ? 'constraint ok' : 'constraint bad'}>
              <Icon name="target" size={12} /> 峰值 {formatNumber(result.summary.peakCoolingIntensityWm2, 1)} W/m²
            </span>
          </div>

          <button type="button" className="btn primary full" onClick={onApply} disabled={evaluating}>
            <Icon name="play" size={15} className={evaluating ? 'spin' : ''} />
            {evaluating ? '正在逐时仿真…' : '应用方案并复算 8,760 小时'}
          </button>
        </section>

        <div className="envelope-kpis">
          <div className="mini-kpi">
            <span>制冷需求</span>
            <strong>{formatNumber(result.summary.annualCoolingMWh, 1)}</strong>
            <em>MWh</em>
            <b className={coolingDelta >= 0 ? 'good' : 'bad'}>{coolingDelta >= 0 ? '-' : '+'}{formatNumber(Math.abs(coolingDelta), 1)}%</b>
          </div>
          <div className="mini-kpi">
            <span>峰值冷负荷</span>
            <strong>{formatNumber(result.summary.peakCoolingKW, 1)}</strong>
            <em>kW</em>
            <b className={peakDelta >= 0 ? 'good' : 'bad'}>{peakDelta >= 0 ? '-' : '+'}{formatNumber(Math.abs(peakDelta), 1)}%</b>
          </div>
          <div className="mini-kpi">
            <span>建筑用电</span>
            <strong>{formatNumber(result.summary.annualBuildingElectricityMWh, 1)}</strong>
            <em>MWh</em>
            <b className={electricDelta >= 0 ? 'good' : 'bad'}>{electricDelta >= 0 ? '-' : '+'}{formatNumber(Math.abs(electricDelta), 1)}%</b>
          </div>
          <div className="mini-kpi">
            <span>光伏自给率</span>
            <strong>{formatNumber(result.summary.pvSelfSufficiencyRatio * 100, 1)}</strong>
            <em>%</em>
            <b className="good">{formatSignedPp((result.summary.pvSelfSufficiencyRatio - baseline.summary.pvSelfSufficiencyRatio) * 100, 2)}</b>
          </div>
          <div className="mini-kpi">
            <span>自消纳率</span>
            <strong>{formatNumber(result.summary.pvSelfConsumptionRatio * 100, 1)}</strong>
            <em>%</em>
            <b className={result.summary.pvSelfConsumptionRatio >= baseline.summary.pvSelfConsumptionRatio ? 'good' : 'warn'}>
              {formatSignedPp((result.summary.pvSelfConsumptionRatio - baseline.summary.pvSelfConsumptionRatio) * 100, 2)}
            </b>
          </div>
          <div className="mini-kpi">
            <span>冷负荷强度</span>
            <strong>{formatNumber(result.summary.coolingIntensityKWhM2, 1)}</strong>
            <em>kWh/m²</em>
            <b className="muted">目标 ≤ 165</b>
          </div>
        </div>
      </div>

      <div className="envelope-grid">
        <ParetoChart
          points={optimization.fast.candidates.filter((point) => point.coolingMWh <= baseline.summary.annualCoolingMWh * 1.25)}
          baseline={baseline}
          recommended={optimization.recommended}
          onSelect={onPickCandidate}
        />
        <section className="side-card agent-detail">
          <div className="side-card-head">
            <div>
              <span className="eyebrow">AGENT RATIONALE</span>
              <h3>优化解释</h3>
            </div>
            <span className="tag green">Pareto {optimization.search.paretoSize}</span>
          </div>
          <p className="agent-headline">{optimization.agent.headline}</p>
          <div className="agent-bullets full">
            {optimization.agent.bullets.map((bullet) => (
              <div key={bullet} className="agent-bullet">
                <Icon name="check" size={13} />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="table-card">
        <div className="table-head">
          <div>
            <span className="eyebrow">SCENARIO COMPARISON</span>
            <h3>基准方案 vs 当前方案</h3>
          </div>
          <span className="mono muted">{isRecommended ? 'Agent recommended' : 'Custom design'}</span>
        </div>
        <div className="data-table">
          <div className="data-table-row head">
            <span>指标</span><span>基准</span><span>当前</span><span>变化</span>
          </div>
          {[
            ['全年制冷 / MWh', baseline.summary.annualCoolingMWh, result.summary.annualCoolingMWh],
            ['全年制热 / MWh', baseline.summary.annualHeatingMWh, result.summary.annualHeatingMWh],
            ['建筑用电 / MWh', baseline.summary.annualBuildingElectricityMWh, result.summary.annualBuildingElectricityMWh],
            ['峰值冷负荷 / kW', baseline.summary.peakCoolingKW, result.summary.peakCoolingKW],
            ['冷负荷强度 / kWh/m²', baseline.summary.coolingIntensityKWhM2, result.summary.coolingIntensityKWhM2],
            ['Openlab 制冷 / MWh', baseline.openlab.coolingMWh, result.openlab.coolingMWh],
          ].map(([label, base, value]) => {
            const change = deltaPct(base, value);
            return (
              <div className="data-table-row" key={label}>
                <span>{label}</span>
                <b>{formatNumber(base, 1)}</b>
                <b>{formatNumber(value, 1)}</b>
                <span className={change >= 0 ? 'good' : 'bad'}>{change >= 0 ? '-' : '+'}{formatNumber(Math.abs(change), 1)}%</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
