import React, { useId, useMemo, useState } from 'react';
import { formatNumber, formatPercent } from '../lib/format.js';

function downsample(values, target = 1460) {
  const step = Math.max(1, Math.floor(values.length / target));
  const result = [];
  for (let i = 0; i < values.length; i += step) {
    let sum = 0;
    let count = 0;
    for (let j = i; j < Math.min(values.length, i + step); j += 1) {
      sum += values[j];
      count += 1;
    }
    result.push(sum / Math.max(1, count));
  }
  return result;
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const MONTH_STARTS = [0, 744, 1416, 2160, 2880, 3624, 4344, 5088, 5832, 6552, 7296, 8016, 8760];

export function HourlyChart({ baseline, optimized, svgRef, height = 280, compact = false }) {
  const gradientId = useId().replace(/:/g, '');
  const [hover, setHover] = useState(null);
  const width = 1120;
  const margin = { left: 54, right: 22, top: 18, bottom: 34 };
  const base = useMemo(() => downsample(baseline.hourly.coolingKW), [baseline]);
  const opt = useMemo(() => downsample(optimized.hourly.coolingKW), [optimized]);
  const max = Math.max(...base, ...opt, 1) * 1.08;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = (index) => margin.left + (index / (base.length - 1)) * innerW;
  const y = (value) => margin.top + innerH - (value / max) * innerH;
  const path = (values) => values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(2)},${y(value).toFixed(2)}`).join('');

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    if (px < margin.left || px > width - margin.right) {
      setHover(null);
      return;
    }
    const index = Math.round(((px - margin.left) / innerW) * (base.length - 1));
    setHover({ index, x: x(index), y: y(opt[index]) });
  };

  return (
    <div className={`chart-card hourly-card ${compact ? 'compact' : ''}`}>
      <div className="chart-head">
        <div>
          <span className="eyebrow">ANNUAL HOURLY PROFILE</span>
          <h3>全年逐时冷负荷</h3>
        </div>
        <div className="chart-head-right">
          <span className="chart-pill"><i className="legend-swatch baseline" /> 基准</span>
          <span className="chart-pill"><i className="legend-swatch optimized" /> 优化</span>
          <span className="chart-pill mono">8,760 h</span>
        </div>
      </div>
      <div className="chart-svg-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="chart-svg"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="全年逐时冷负荷曲线"
        >
          <defs>
            <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line x1={margin.left} x2={width - margin.right} y1={y(max * ratio)} y2={y(max * ratio)} className="chart-grid" />
              <text x={margin.left - 8} y={y(max * ratio) + 3} textAnchor="end" className="chart-axis-label">
                {Math.round(max * ratio)}
              </text>
            </g>
          ))}
          {MONTHS.map((month, index) => {
            const mx = margin.left + (MONTH_STARTS[index] / 8760) * innerW;
            return (
              <g key={month}>
                <line x1={mx} x2={mx} y1={margin.top} y2={margin.top + innerH} className="chart-grid vertical" />
                <text x={mx + 4} y={height - 10} className="chart-axis-label">{month}</text>
              </g>
            );
          })}
          <path d={`${path(opt)}L${width - margin.right},${margin.top + innerH}L${margin.left},${margin.top + innerH}Z`} fill={`url(#area-${gradientId})`} />
          <path d={path(base)} className="series-line baseline" />
          <path d={path(opt)} className="series-line optimized" />
          {hover && (
            <g>
              <line x1={hover.x} x2={hover.x} y1={margin.top} y2={margin.top + innerH} className="hover-line" />
              <circle cx={hover.x} cy={y(base[hover.index])} r="3.5" fill="#f6b73c" />
              <circle cx={hover.x} cy={y(opt[hover.index])} r="3.5" fill="#22d3ee" />
            </g>
          )}
          <text x={margin.left} y={12} className="chart-unit">kW</text>
        </svg>
        {hover && (
          <div
            className="chart-tooltip"
            style={{ left: `${(hover.x / width) * 100}%`, top: `${(hover.y / height) * 100}%` }}
          >
            <strong>第 {formatNumber((hover.index / base.length) * 8760, 0)} h</strong>
            <span><i className="legend-swatch baseline" /> 基准 {formatNumber(base[hover.index], 1)} kW</span>
            <span><i className="legend-swatch optimized" /> 优化 {formatNumber(opt[hover.index], 1)} kW</span>
          </div>
        )}
      </div>
      <div className="chart-foot">
        <span>峰值 {formatNumber(optimized.summary.peakCoolingKW, 1)} kW</span>
        <span>冷负荷强度 {formatNumber(optimized.summary.coolingIntensityKWhM2, 1)} kWh/m²</span>
        <span>全年制冷 {formatNumber(optimized.summary.annualCoolingMWh, 1)} MWh</span>
      </div>
    </div>
  );
}
