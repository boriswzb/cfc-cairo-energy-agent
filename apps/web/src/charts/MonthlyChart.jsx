import React from 'react';
import { formatNumber } from '../lib/format.js';

export function MonthlyChart({ baseline, optimized, svgRef, height = 260, compact = false }) {
  const width = 620;
  const margin = { left: 44, right: 14, top: 18, bottom: 28 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const max = Math.max(...baseline.monthly.map((m) => m.coolingMWh), ...optimized.monthly.map((m) => m.coolingMWh), 1) * 1.12;
  const group = innerW / 12;
  const bar = Math.min(15, group * 0.28);
  const y = (value) => margin.top + innerH - (value / max) * innerH;

  return (
    <div className={`chart-card monthly-card ${compact ? 'compact' : ''}`}>
      <div className="chart-head">
        <div>
          <span className="eyebrow">MONTHLY BREAKDOWN</span>
          <h3>逐月制冷需求</h3>
        </div>
        <div className="chart-head-right">
          <span className="chart-pill"><i className="legend-swatch baseline" /> 基准</span>
          <span className="chart-pill"><i className="legend-swatch optimized" /> 优化</span>
        </div>
      </div>
      <div className="chart-svg-wrap">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="逐月制冷需求柱状图">
          {[0, 0.5, 1].map((ratio) => (
            <g key={ratio}>
              <line x1={margin.left} x2={width - margin.right} y1={y(max * ratio)} y2={y(max * ratio)} className="chart-grid" />
              <text x={margin.left - 7} y={y(max * ratio) + 3} textAnchor="end" className="chart-axis-label">
                {Math.round(max * ratio)}
              </text>
            </g>
          ))}
          {baseline.monthly.map((month, index) => {
            const cx = margin.left + group * index + group / 2;
            const h1 = margin.top + innerH - y(month.coolingMWh);
            const h2 = margin.top + innerH - y(optimized.monthly[index].coolingMWh);
            return (
              <g key={month.month}>
                <rect x={cx - bar - 2} y={y(month.coolingMWh)} width={bar} height={h1} rx="2" fill="#f6b73c" opacity="0.82" />
                <rect x={cx + 2} y={y(optimized.monthly[index].coolingMWh)} width={bar} height={h2} rx="2" fill="#22d3ee" opacity="0.82" />
                <text x={cx} y={height - 8} textAnchor="middle" className="chart-axis-label">{month.month}</text>
              </g>
            );
          })}
          <text x={margin.left} y={12} className="chart-unit">MWh</text>
        </svg>
      </div>
      <div className="chart-foot">
        <span>7 月峰值 {formatNumber(optimized.monthly[6].coolingMWh, 1)} MWh</span>
        <span>冬季最低 {formatNumber(optimized.monthly[0].coolingMWh, 1)} MWh</span>
        <span>冷热比 {formatNumber(optimized.summary.coolingShare * 100, 1)}%</span>
      </div>
    </div>
  );
}
