import React from 'react';
import { Icon } from './Icons.jsx';
import { PvDayChart } from '../charts/EnergyCharts.jsx';
import { formatNumber, formatPercent, formatSignedPp } from '../lib/format.js';

export function PvPage({ optimization }) {
  const { baseline, recommended: result, savings } = optimization;
  const pv = result.pv;
  const months = result.monthly;
  const maxPv = Math.max(...months.map((month) => month.pvYieldMWh), 1);
  return (
    <div className="page pv-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow"><Icon name="sun" size={13} /> ROOFTOP PV & MATCHING</span>
          <h1>光伏发电与建筑用电匹配</h1>
          <p>160 kWp 屋顶光伏、20° 南向。分析发电、自用、余电上网与建筑用电自给率，评估围护提效对消纳结构的影响。</p>
        </div>
        <div className="heading-badge">
          <span><b>{formatNumber(result.summary.pvYieldMWh, 0)}</b> MWh / 年</span>
          <small>{formatNumber(result.summary.specificYieldKWhPerKWp, 0)} kWh/kWp</small>
        </div>
      </header>

      <div className="pv-kpis">
        <div className="pv-kpi gold"><span>年发电量</span><strong>{formatNumber(result.summary.pvYieldMWh, 1)}</strong><em>MWh</em></div>
        <div className="pv-kpi cyan"><span>自用消纳</span><strong>{formatNumber(result.summary.pvSelfConsumedMWh, 1)}</strong><em>MWh</em></div>
        <div className="pv-kpi"><span>余电上网</span><strong>{formatNumber(result.summary.pvExportMWh, 1)}</strong><em>MWh</em></div>
        <div className="pv-kpi green"><span>自消纳率</span><strong>{formatNumber(result.summary.pvSelfConsumptionRatio * 100, 1)}</strong><em>%</em></div>
        <div className="pv-kpi"><span>建筑用电自给率</span><strong>{formatNumber(result.summary.pvSelfSufficiencyRatio * 100, 1)}</strong><em>%</em></div>
      </div>

      <div className="pv-grid">
        <PvDayChart result={result} />
        <section className="side-card pv-gauge-card">
          <div className="side-card-head">
            <div>
              <span className="eyebrow">SELF-CONSUMPTION</span>
              <h3>消纳结构</h3>
            </div>
            <span className="tag gold">运营建议</span>
          </div>
          <div className="consumption-gauge">
            <svg viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(147,187,219,.12)" strokeWidth="14" />
              <circle
                cx="100"
                cy="100"
                r="78"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${result.summary.pvSelfConsumptionRatio * 490} 490`}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div>
              <strong>{formatPercent(result.summary.pvSelfConsumptionRatio, 1)}</strong>
              <span>PV 自消纳</span>
            </div>
          </div>
          <div className="pv-gauge-rows">
            <div><span>自用</span><b>{formatNumber(result.summary.pvSelfConsumedMWh, 1)} MWh</b></div>
            <div><span>上网</span><b>{formatNumber(result.summary.pvExportMWh, 1)} MWh</b></div>
            <div><span>自给率变化</span><b className="good">{formatSignedPp(savings.selfSufficiencyDeltaPp, 2)}</b></div>
            <div><span>消纳率变化</span><b className={savings.selfConsumptionDeltaPp >= 0 ? 'good' : 'warn'}>{formatSignedPp(savings.selfConsumptionDeltaPp, 2)}</b></div>
          </div>
          <div className="pv-note">
            <Icon name="info" size={13} />
            <span>
              围护提效降低白天冷负荷，自消纳率可能小幅下降；本方案自给率提升
              {formatSignedPp(savings.selfSufficiencyDeltaPp, 2)}。若进一步配置午间蓄冷/预冷，可将富余光伏迁移至傍晚。
            </span>
          </div>
        </section>
      </div>

      <div className="pv-bottom">
        <section className="table-card">
          <div className="table-head">
            <div>
              <span className="eyebrow">MONTHLY PV</span>
              <h3>逐月发电与用电</h3>
            </div>
            <span className="mono muted">MWh</span>
          </div>
          <div className="data-table pv-table">
            <div className="data-table-row head">
              <span>月份</span><span>发电</span><span>自用</span><span>上网</span><span>用电</span><span>自给率</span>
            </div>
            {months.map((month) => (
              <div className="data-table-row" key={month.month}>
                <span>{month.name}</span>
                <b>{formatNumber(month.pvYieldMWh, 1)}</b>
                <b>{formatNumber(month.pvSelfMWh, 1)}</b>
                <b>{formatNumber(month.pvExportMWh, 1)}</b>
                <b>{formatNumber(month.demandMWh, 1)}</b>
                <b>{formatPercent(month.pvSelfMWh / Math.max(month.demandMWh, 1e-9), 1)}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="side-card monthly-pv-card">
          <div className="side-card-head">
            <div>
              <span className="eyebrow">MONTHLY YIELD</span>
              <h3>发电季节分布</h3>
            </div>
          </div>
          <div className="mini-bars">
            {months.map((month) => (
              <div className="mini-bar-row" key={month.month}>
                <span>{month.month}月</span>
                <div className="mini-bar-track">
                  <div className="mini-bar-fill" style={{ width: `${(month.pvYieldMWh / maxPv) * 100}%` }} />
                </div>
                <b>{formatNumber(month.pvYieldMWh, 1)}</b>
              </div>
            ))}
          </div>
          <div className="pv-cost-note">
            <span>年减碳</span>
            <strong>{formatNumber(result.summary.co2AvoidedTonnes, 1)} tCO₂</strong>
            <small>按 0.43 kgCO₂/kWh 电网因子估算</small>
          </div>
        </section>
      </div>
    </div>
  );
}
