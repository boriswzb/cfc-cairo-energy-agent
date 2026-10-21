import React from 'react';
import { Icon } from './Icons.jsx';
import { OpenlabChart } from '../charts/EnergyCharts.jsx';
import { formatNumber, formatPercent } from '../lib/format.js';

export function OpenlabPage({ optimization, onShowIn3D }) {
  const result = optimization.recommended;
  const lab = result.openlab;
  const components = [
    ['IT 设备', lab.components.it, '#f97316'],
    ['UPS 散热', lab.components.ups, '#fb923c'],
    ['新风潜热', lab.components.ventilationLatent, '#38bdf8'],
    ['照明', lab.components.lighting, '#fbbf24'],
    ['设备', lab.components.equipment, '#a78bfa'],
    ['围护得热', lab.components.envelope, '#68a8c8'],
    ['新风显热', lab.components.ventilationSensible, '#60a5fa'],
  ];
  const total = lab.coolingMWh;
  return (
    <div className="page openlab-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow"><Icon name="server" size={13} /> OPENLAB · 1F</span>
          <h1>Openlab 机房热负荷</h1>
          <p>1F 西侧小型机房，IT 设备 12 kW 与 UPS 1.5 kW 全天候运行；采用独立 22 °C 精密空调系统，单独计量。</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="btn ghost" onClick={onShowIn3D}>
            <Icon name="building" size={16} />
            在三维中查看
          </button>
        </div>
      </header>

      <div className="lab-hero">
        <div className="lab-chip"><Icon name="server" size={18} /> 24 / 7 独立系统</div>
        <div className="lab-kpis">
          <div><span>全年制冷</span><strong>{formatNumber(lab.coolingMWh, 1)}</strong><em>MWh</em></div>
          <div><span>制冷电耗</span><strong>{formatNumber(lab.coolingElectricityMWh, 1)}</strong><em>MWh</em></div>
          <div><span>峰值冷负荷</span><strong>{formatNumber(lab.peakKW, 1)}</strong><em>kW</em></div>
          <div><span>单位面积</span><strong>{formatNumber(lab.intensityWm2, 0)}</strong><em>W/m²</em></div>
          <div><span>占全楼冷负荷</span><strong>{formatNumber(result.summary.openlabShare * 100, 1)}</strong><em>%</em></div>
        </div>
        <div className="lab-temp">
          <span>送风设定点</span>
          <strong>{lab.setpointC} °C</strong>
          <small>面积 {lab.area} m² · 新风 150 L/s</small>
        </div>
      </div>

      <div className="lab-grid">
        <OpenlabChart result={result} />
        <section className="side-card lab-breakdown">
          <div className="side-card-head">
            <div>
              <span className="eyebrow">HEAT GAIN BREAKDOWN</span>
              <h3>机房得热构成</h3>
            </div>
            <span className="mono muted">{formatNumber(total, 0)} MWh</span>
          </div>
          <div className="lab-component-list">
            {components.map(([label, value, color]) => (
              <div className="lab-component" key={label}>
                <span><i style={{ background: color }} />{label}</span>
                <div><div style={{ width: `${(Math.max(0, value) / Math.max(lab.components.it, 1)) * 100}%`, background: color }} /></div>
                <b>{formatNumber(value, 1)}</b>
              </div>
            ))}
          </div>
          <div className="lab-note">
            <Icon name="info" size={13} />
            IT 热负荷占比 {formatPercent(lab.components.it / total, 0)}。机房热负荷对围护变化不敏感，建议优先优化气流组织与冷冻水温。
          </div>
        </section>
      </div>

      <div className="lab-bottom">
        <section className="table-card">
          <div className="table-head">
            <div>
              <span className="eyebrow">MONTHLY OPENLAB</span>
              <h3>逐月机房冷负荷</h3>
            </div>
            <span className="mono muted">MWh</span>
          </div>
          <div className="data-table openlab-table">
            <div className="data-table-row head">
              <span>月份</span><span>制冷量</span><span>室外均温</span><span>IT 散热</span>
            </div>
            {result.monthly.map((month) => (
              <div className="data-table-row" key={month.month}>
                <span>{month.name}</span>
                <b>{formatNumber(month.openlabCoolingMWh, 2)}</b>
                <b>{formatNumber(month.outdoorMeanC, 1)} °C</b>
                <b>{formatNumber((result.openlab.components.it / 12), 2)}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="side-card lab-insight">
          <span className="eyebrow">ENGINEERING NOTE</span>
          <h3>机房设计提示</h3>
          <ul>
            <li>IT 散热全年稳定，冷却负荷与室外温度弱相关。</li>
            <li>建议设置独立电表与冷量表，分离办公与机房能耗。</li>
            <li>提高送风温度至 24 °C 或采用EC风机可进一步降低制冷电耗。</li>
            <li>围护优化对机房负荷影响有限，机房重点应放在热回收与气流组织。</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
