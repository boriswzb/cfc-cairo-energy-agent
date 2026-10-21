import React from 'react';
import { Icon } from './Icons.jsx';

const STEPS = [
  ['weather', '读取开罗 TMYx 逐时气象', '8,760 h · 42.4 °C 极端高温'],
  ['thermal', '3R2C 围护与内热逐时求解', '6 层 · 7,290 m² · 5 个外表面'],
  ['optimize', '围护组合多目标搜索', '192 候选 · Pareto 前沿'],
  ['verify', '能量平衡与极端工况校验', '偏差阈值 5% · 自动修正'],
];

function phaseWeight(progress) {
  if (!progress) return 0.02;
  if (progress.phase === 'baseline') return 0.12;
  if (progress.phase === 'precompute') return 0.22;
  if (progress.phase === 'search') return 0.25 + 0.6 * ((progress.completed ?? 0) / Math.max(progress.total ?? 192, 1));
  if (progress.phase === 'detailed') return 0.88 + 0.1 * ((progress.completed ?? 0) / Math.max(progress.total ?? 2, 1));
  if (progress.phase === 'done') return 1;
  return 0.04;
}

export function LoadingScreen({ progress, error, onRetry }) {
  const ratio = error ? 0 : phaseWeight(progress);
  const activeIndex = progress?.phase === 'baseline' ? 0 : progress?.phase === 'precompute' ? 1 : progress?.phase === 'search' ? 2 : 3;
  if (error) {
    return (
      <div className="loading-screen error-screen">
        <div className="loading-panel">
          <span className="eyebrow">SIMULATION ERROR</span>
          <h1>仿真未能完成</h1>
          <p>{error}</p>
          <button type="button" className="btn primary" onClick={onRetry}>
            <Icon name="refresh" size={16} /> 重新运行
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="loading-screen">
      <div className="loading-grid" />
      <div className="loading-orbit" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className="loading-panel">
        <span className="eyebrow"><Icon name="bolt" size={13} /> CFC CAIRO · ENERGY TWIN</span>
        <h1>正在求解全年 8,760 小时</h1>
        <p>热工内核、围护优化 Agent 与光伏匹配正在并行计算。六层建筑模型将在结果就绪后载入。</p>
        <div className="loading-progress">
          <div className="loading-progress-label">
            <span>{progress?.message ?? '初始化…'}</span>
            <b>{Math.round(ratio * 100)}%</b>
          </div>
          <div className="loading-track"><div style={{ width: `${ratio * 100}%` }} /></div>
        </div>
        <div className="loading-steps">
          {STEPS.map(([key, title, detail], index) => (
            <div key={key} className={`loading-step ${index < activeIndex ? 'done' : index === activeIndex ? 'active' : ''}`}>
              <span>{index < activeIndex ? <Icon name="check" size={13} /> : String(index + 1).padStart(2, '0')}</span>
              <div><strong>{title}</strong><small>{detail}</small></div>
            </div>
          ))}
        </div>
        <div className="loading-foot">
          <span>TMYx Cairo Intl. AP 623660</span>
          <span>3R2C · 8,760 h</span>
          <span>Openlab 独立计量</span>
        </div>
      </div>
    </div>
  );
}
