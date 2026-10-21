import React from 'react';
import {
  GLAZING_TYPES,
  SHADING_STRATEGIES,
  orientationLabel,
} from '@cfc/energy-core';
import { Icon } from './Icons.jsx';
import { formatNumber, formatPercent, formatSignedPp } from '../lib/format.js';

export function KpiCard({ label, value, unit, delta, note, tone = 'cyan', icon = 'activity' }) {
  return (
    <div className={`kpi-card tone-${tone}`}>
      <div className="kpi-top">
        <span className="kpi-icon"><Icon name={icon} size={16} /></span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">
        <strong>{value}</strong>
        <em>{unit}</em>
      </div>
      <div className="kpi-foot">
        {delta && <span className={`kpi-delta ${delta.startsWith('-') ? 'good' : delta.startsWith('+') ? 'up' : ''}`}>{delta}</span>}
        <span className="kpi-note">{note}</span>
      </div>
    </div>
  );
}

export function AgentSummary({ optimization, current, onOpenEnvelope }) {
  const { baseline, savings, agent, recommended } = optimization;
  return (
    <section className="side-card agent-card">
      <div className="side-card-head">
        <div>
          <span className="eyebrow"><Icon name="sparkles" size={13} /> OPTIMIZATION AGENT</span>
          <h3>围护优化建议</h3>
        </div>
        <span className="agent-live"><i /> {optimization.search.paretoSize} Pareto</span>
      </div>
      <p className="agent-headline">{agent.headline}</p>
      <div className="agent-savings">
        <div>
          <span>制冷节能</span>
          <strong>{formatNumber(savings.coolingPct, 1)}<em>%</em></strong>
        </div>
        <div>
          <span>峰值削减</span>
          <strong>{formatNumber(savings.peakPct, 1)}<em>%</em></strong>
        </div>
        <div>
          <span>用电节省</span>
          <strong>{formatNumber(savings.electricityPct, 1)}<em>%</em></strong>
        </div>
      </div>
      <div className="design-chiplist">
        <span>{recommended.design.wallInsulationMm} mm 保温</span>
        <span>WWR {formatPercent(recommended.design.wwr, 0)}</span>
        <span>{GLAZING_TYPES[recommended.design.glazing].short}</span>
        <span>{SHADING_STRATEGIES[recommended.design.shading].short}遮阳</span>
      </div>
      <div className="agent-bullets">
        {agent.bullets.slice(0, 3).map((bullet) => (
          <div key={bullet} className="agent-bullet">
            <Icon name="check" size={13} />
            <span>{bullet}</span>
          </div>
        ))}
      </div>
      <button type="button" className="text-link" onClick={onOpenEnvelope}>
        查看围护优化与 Pareto 前沿
        <Icon name="arrowRight" size={14} />
      </button>
    </section>
  );
}

export function BreakdownCard({ result }) {
  const c = result.components;
  const categories = [
    { label: '太阳得热', value: c.solar, color: '#f6b73c' },
    { label: '人员散热', value: c.peopleSensible + c.peopleLatent, color: '#f472b6' },
    { label: '照明', value: c.lighting, color: '#fbbf24' },
    { label: '设备', value: c.equipment, color: '#a78bfa' },
    { label: '新风/渗透', value: c.ventilationSensible + c.ventilationLatent + c.infiltrationSensible + c.infiltrationLatent, color: '#38bdf8' },
    { label: 'Openlab', value: result.openlab.components.total, color: '#f97316' },
    { label: '围护净传热', value: c.wall + c.roof + c.windowConduction, color: '#68a8c8' },
  ];
  const max = Math.max(...categories.map((item) => Math.abs(item.value)), 1);
  return (
    <section className="side-card breakdown-card">
      <div className="side-card-head">
        <div>
          <span className="eyebrow">LOAD BREAKDOWN</span>
          <h3>冷负荷构成</h3>
        </div>
        <span className="mono muted">{formatNumber(result.summary.annualCoolingMWh, 0)} MWh</span>
      </div>
      <div className="breakdown-list">
        {categories.map((item) => {
          const ratio = Math.abs(item.value) / max;
          return (
            <div className="breakdown-row" key={item.label}>
              <span>{item.label}</span>
              <div className="breakdown-track">
                <div
                  className={`breakdown-fill ${item.value < 0 ? 'negative' : ''}`}
                  style={{ width: `${Math.max(2, ratio * 100)}%`, background: item.color }}
                />
              </div>
              <b>{formatNumber(item.value, 1)}</b>
            </div>
          );
        })}
      </div>
      <div className="breakdown-note">
        <Icon name="info" size={12} />
        围护负值表示夜间向室外散热，可抵消部分内部得热。
      </div>
    </section>
  );
}

export function ValidationCard({ result }) {
  const validation = result.validation;
  const summary = result.summary;
  return (
    <section className={`side-card validation-card ${validation.passed ? 'pass' : 'fail'}`}>
      <div className="side-card-head">
        <div>
          <span className="eyebrow">ENERGY BALANCE GUARD</span>
          <h3>计算校验</h3>
        </div>
        <span className={`validation-badge ${validation.passed ? 'pass' : 'fail'}`}>
          <Icon name={validation.passed ? 'check' : 'alert'} size={14} />
          {validation.passed ? '通过' : '复核'}
        </span>
      </div>
      <div className="validation-rows">
        <div>
          <span>全年分项平衡</span>
          <b>{formatNumber(validation.energyBalanceErrorPct, 4)}%</b>
        </div>
        <div>
          <span>47.2 °C 墙/屋面偏差</span>
          <b>{formatNumber(validation.extremeCase.wallErrorPct, 3)} / {formatNumber(validation.extremeCase.roofErrorPct, 3)}%</b>
        </div>
        <div>
          <span>热舒适满足率</span>
          <b className={summary.comfortCompliance >= 0.98 ? 'good' : 'warn'}>{formatPercent(summary.comfortCompliance, 1)}</b>
        </div>
        <div>
          <span>峰值冷负荷强度</span>
          <b>{formatNumber(summary.peakCoolingIntensityWm2, 1)} W/m²</b>
        </div>
      </div>
      <div className="validation-foot">
        <span><i className={`status-dot ${validation.passed ? 'ok' : 'warn'}`} /> {validation.method}</span>
      </div>
    </section>
  );
}

export function FloorLoadChart({ result, onFloorSelect }) {
  const max = Math.max(...result.floors.map((floor) => floor.coolingMWh), 1);
  return (
    <section className="side-card floor-card">
      <div className="side-card-head">
        <div>
          <span className="eyebrow">FLOOR LOAD</span>
          <h3>分层冷负荷</h3>
        </div>
        <span className="mono muted">MWh</span>
      </div>
      <div className="floor-list">
        {result.floors.map((floor) => (
          <button type="button" key={floor.level} className="floor-row" onClick={() => onFloorSelect(floor.level)}>
            <span className="floor-code">{floor.short}</span>
            <div className="floor-track">
              <div className="floor-fill" style={{ width: `${(floor.coolingMWh / max) * 100}%` }} />
            </div>
            <b>{formatNumber(floor.coolingMWh, 0)}</b>
            <small>{formatNumber(floor.peakIntensityWm2, 0)} W/m²</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export function SchemeCompareMini({ baseline, optimized, savings }) {
  const rows = [
    ['制冷需求', baseline.summary.annualCoolingMWh, optimized.summary.annualCoolingMWh, 'MWh'],
    ['峰值冷负荷', baseline.summary.peakCoolingKW, optimized.summary.peakCoolingKW, 'kW'],
    ['建筑用电', baseline.summary.annualBuildingElectricityMWh, optimized.summary.annualBuildingElectricityMWh, 'MWh'],
  ];
  return (
    <section className="side-card compare-card">
      <div className="side-card-head">
        <div>
          <span className="eyebrow">BASELINE VS OPTIMIZED</span>
          <h3>方案对比</h3>
        </div>
      </div>
      <div className="compare-table">
        <div className="compare-head"><span>指标</span><span>基准</span><span>优化</span></div>
        {rows.map(([label, base, opt, unit]) => (
          <div className="compare-row" key={label}>
            <span>{label}</span>
            <b>{formatNumber(base, 1)} <small>{unit}</small></b>
            <b className="opt">{formatNumber(opt, 1)} <small>{unit}</small></b>
          </div>
        ))}
      </div>
      <div className="compare-foot">
        <span><i className="legend-swatch baseline" /> 基准</span>
        <span><i className="legend-swatch optimized" /> 优化</span>
        <span>自给率 {formatSignedPp(savings.selfSufficiencyDeltaPp, 2)}</span>
      </div>
    </section>
  );
}
