import React from 'react';
import { formatNumber } from '../lib/format.js';

export function PvDayChart({ result }) {
  const width = 700;
  const height = 280;
  const margin = { left: 48, right: 18, top: 20, bottom: 34 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const profile = result.pv.julyProfile;
  const max = Math.max(...profile.map((slot) => slot.demand), ...profile.map((slot) => slot.pv), 1) * 1.1;
  const x = (hour) => margin.left + (hour / 23) * innerW;
  const y = (value) => margin.top + innerH - (value / max) * innerH;
  const line = (accessor) => profile.map((slot, hour) => `${hour === 0 ? 'M' : 'L'}${x(hour).toFixed(2)},${y(accessor(slot)).toFixed(2)}`).join('');
  const area = `${line((slot) => slot.pv)}L${x(23)},${margin.top + innerH}L${x(0)},${margin.top + innerH}Z`;

  return (
    <div className="chart-card pv-day-card">
      <div className="chart-head">
        <div>
          <span className="eyebrow">PV / DEMAND · JULY</span>
          <h3>七月典型日光伏匹配</h3>
        </div>
        <div className="chart-head-right">
          <span className="chart-pill"><i className="legend-swatch demand" /> 建筑用电</span>
          <span className="chart-pill"><i className="legend-swatch pv" /> 光伏出力</span>
        </div>
      </div>
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="七月典型日光伏与建筑用电匹配">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line x1={margin.left} x2={width - margin.right} y1={y(max * ratio)} y2={y(max * ratio)} className="chart-grid" />
              <text x={margin.left - 7} y={y(max * ratio) + 3} textAnchor="end" className="chart-axis-label">{Math.round(max * ratio)}</text>
            </g>
          ))}
          {[0, 6, 12, 18, 23].map((hour) => (
            <text key={hour} x={x(hour)} y={height - 10} textAnchor="middle" className="chart-axis-label">{String(hour).padStart(2, '0')}:00</text>
          ))}
          <path d={area} fill="rgba(246,183,60,0.09)" />
          <path d={line((slot) => slot.demand)} stroke="#f472b6" strokeWidth="2.2" fill="none" />
          <path d={line((slot) => slot.pv)} stroke="#f6b73c" strokeWidth="2.6" fill="none" />
          <path d={line((slot) => Math.max(0, slot.demand - slot.pv))} stroke="#7897aa" strokeWidth="1.4" fill="none" strokeDasharray="4 4" />
          <text x={margin.left} y={12} className="chart-unit">kW</text>
        </svg>
      </div>
      <div className="chart-foot">
        <span>自消纳 {formatNumber(result.summary.pvSelfConsumptionRatio * 100, 1)}%</span>
        <span>自给率 {formatNumber(result.summary.pvSelfSufficiencyRatio * 100, 1)}%</span>
        <span>峰值出力 {formatNumber(Math.max(...profile.map((slot) => slot.pv)), 1)} kW</span>
      </div>
    </div>
  );
}

export function OpenlabChart({ result }) {
  const width = 700;
  const height = 260;
  const margin = { left: 44, right: 18, top: 20, bottom: 34 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const values = result.openlab.julyProfile;
  const max = Math.max(...values, 1) * 1.12;
  const x = (hour) => margin.left + (hour / 23) * innerW;
  const y = (value) => margin.top + innerH - (value / max) * innerH;
  const path = values.map((value, hour) => `${hour === 0 ? 'M' : 'L'}${x(hour).toFixed(2)},${y(value).toFixed(2)}`).join('');
  return (
    <div className="chart-card openlab-chart">
      <div className="chart-head">
        <div>
          <span className="eyebrow">OPENLAB · 24/7</span>
          <h3>机房典型日冷负荷</h3>
        </div>
        <span className="chart-pill mono">独立计量</span>
      </div>
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Openlab 机房典型日冷负荷">
          {[0, 0.5, 1].map((ratio) => (
            <g key={ratio}>
              <line x1={margin.left} x2={width - margin.right} y1={y(max * ratio)} y2={y(max * ratio)} className="chart-grid" />
              <text x={margin.left - 7} y={y(max * ratio) + 3} textAnchor="end" className="chart-axis-label">{Math.round(max * ratio)}</text>
            </g>
          ))}
          {[0, 6, 12, 18, 23].map((hour) => (
            <text key={hour} x={x(hour)} y={height - 10} textAnchor="middle" className="chart-axis-label">{String(hour).padStart(2, '0')}:00</text>
          ))}
          <path d={`${path}L${x(23)},${margin.top + innerH}L${x(0)},${margin.top + innerH}Z`} fill="rgba(249,115,22,0.1)" />
          <path d={path} stroke="#f97316" strokeWidth="2.4" fill="none" />
          <circle cx={x(12)} cy={y(values[12])} r="4" fill="#ffb07c" />
          <text x={margin.left} y={12} className="chart-unit">kW</text>
        </svg>
      </div>
      <div className="chart-foot">
        <span>IT {formatNumber(result.openlab.itLoadKW, 1)} kW</span>
        <span>峰值 {formatNumber(result.openlab.peakKW, 1)} kW</span>
        <span>全年 {formatNumber(result.openlab.coolingMWh, 1)} MWh</span>
      </div>
    </div>
  );
}
