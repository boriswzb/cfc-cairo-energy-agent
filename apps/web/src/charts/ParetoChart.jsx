import React from 'react';
import { formatNumber, formatPercent } from '../lib/format.js';

export function ParetoChart({ points, baseline, recommended, onSelect }) {
  const width = 760;
  const height = 340;
  const margin = { left: 52, right: 22, top: 22, bottom: 46 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const baseCooling = baseline.summary.annualCoolingMWh;
  const baseSc = baseline.summary.pvSelfConsumptionRatio * 100;
  const xs = points.map((point) => point.coolingMWh).concat([baseCooling]);
  const ys = points.map((point) => point.selfConsumptionRatio * 100).concat([baseSc]);
  const minX = Math.min(...xs) * 0.985;
  const maxX = Math.max(...xs) * 1.01;
  const minY = Math.min(...ys) * 0.995;
  const maxY = Math.max(...ys) * 1.005;
  const x = (value) => margin.left + ((value - minX) / Math.max(1, maxX - minX)) * innerW;
  const y = (value) => margin.top + innerH - ((value - minY) / Math.max(0.01, maxY - minY)) * innerH;
  const paretoIds = new Set(
    points
      .filter((point) => !points.some((other) => other.coolingMWh <= point.coolingMWh && other.selfConsumptionRatio >= point.selfConsumptionRatio && (other.coolingMWh < point.coolingMWh || other.selfConsumptionRatio > point.selfConsumptionRatio)))
      .map((point) => point.id ?? `${point.design.wallInsulationMm}-${point.design.wwr}-${point.design.glazing}-${point.design.shading}`),
  );
  const keyOf = (point) => point.id ?? `${point.design.wallInsulationMm}-${point.design.wwr}-${point.design.glazing}-${point.design.shading}`;

  return (
    <div className="chart-card pareto-card">
      <div className="chart-head">
        <div>
          <span className="eyebrow">PARETO FRONT</span>
          <h3>制冷需求 × 光伏自消纳</h3>
        </div>
        <div className="chart-head-right">
          <span className="chart-pill"><i className="legend-swatch optimized" /> 候选</span>
          <span className="chart-pill"><i className="legend-dot green" /> 推荐</span>
          <span className="chart-pill"><i className="legend-dot gold" /> 基准</span>
        </div>
      </div>
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg pareto-svg" role="img" aria-label="围护方案 Pareto 图">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line x1={margin.left} x2={width - margin.right} y1={y(minY + (maxY - minY) * ratio)} y2={y(minY + (maxY - minY) * ratio)} className="chart-grid" />
              <text x={margin.left - 8} y={y(minY + (maxY - minY) * ratio) + 3} textAnchor="end" className="chart-axis-label">
                {(minY + (maxY - minY) * ratio).toFixed(1)}%
              </text>
            </g>
          ))}
          {points.map((point) => {
            const id = keyOf(point);
            const isRecommended = point.design.wallInsulationMm === recommended.design.wallInsulationMm &&
              point.design.wwr === recommended.design.wwr &&
              point.design.glazing === recommended.design.glazing &&
              point.design.shading === recommended.design.shading;
            return (
              <circle
                key={id}
                cx={x(point.coolingMWh)}
                cy={y(point.selfConsumptionRatio * 100)}
                r={paretoIds.has(id) ? 4.2 : 2.6}
                fill={isRecommended ? '#35d49a' : paretoIds.has(id) ? 'rgba(34,211,238,0.8)' : 'rgba(120,171,195,0.35)'}
                stroke={isRecommended ? '#e8fff8' : 'transparent'}
                strokeWidth={1.5}
                className="pareto-point"
                onClick={() => onSelect?.(point)}
              >
                <title>{`${point.design.wallInsulationMm} mm · ${(point.design.wwr * 100).toFixed(0)}% · ${point.design.glazing} · ${point.design.shading}\n${point.coolingMWh.toFixed(1)} MWh · 自消纳 ${(point.selfConsumptionRatio * 100).toFixed(1)}%`}</title>
              </circle>
            );
          })}
          <circle cx={x(baseCooling)} cy={y(baseSc)} r="5.5" fill="#f6b73c" stroke="#fff4d2" strokeWidth="1.5" />
          <text x={x(baseCooling) + 9} y={y(baseSc) + 16} className="chart-annotation">基准</text>
          <circle cx={x(recommended.summary.annualCoolingMWh)} cy={y(recommended.summary.pvSelfConsumptionRatio * 100)} r="6.5" fill="#35d49a" stroke="#d9fff1" strokeWidth="1.5" />
          <text x={x(recommended.summary.annualCoolingMWh) + 10} y={y(recommended.summary.pvSelfConsumptionRatio * 100) - 10} className="chart-annotation green">推荐</text>
          <text x={margin.left + innerW / 2} y={height - 12} textAnchor="middle" className="chart-axis-title">全年制冷需求（MWh）</text>
          <text x={14} y={margin.top + innerH / 2} transform={`rotate(-90 14 ${margin.top + innerH / 2})`} textAnchor="middle" className="chart-axis-title">光伏自消纳率</text>
        </svg>
      </div>
      <div className="chart-foot">
        <span>{points.length} 个候选 · {paretoIds.size} 个非支配解</span>
        <span>推荐 {formatNumber(recommended.summary.annualCoolingMWh, 1)} MWh</span>
        <span>自消纳 {formatPercent(recommended.summary.pvSelfConsumptionRatio, 1)}</span>
      </div>
    </div>
  );
}
