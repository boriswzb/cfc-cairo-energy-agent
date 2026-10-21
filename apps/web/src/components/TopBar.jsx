import React from 'react';
import { Icon, BrandMark } from './Icons.jsx';

const PAGES = [
  { id: 'overview', label: '总览', icon: 'overview' },
  { id: 'envelope', label: '围护优化', icon: 'layers' },
  { id: 'pv', label: '光伏匹配', icon: 'sun' },
  { id: 'openlab', label: 'Openlab', icon: 'server' },
  { id: 'reports', label: '报表', icon: 'file' },
];

export function TopBar({
  page,
  onNavigate,
  metadata,
  optimization,
  optimizing,
  progress,
  onOptimize,
  onExport,
}) {
  const maxTemp = metadata?.annual?.tdbMax ?? 42.4;
  return (
    <header className="topbar">
      <div className="brand-block">
        <BrandMark size={43} />
        <div>
          <div className="brand-line">
            <strong>CFC<span>·</span>CAIRO</strong>
            <em>ENERGY TWIN</em>
          </div>
          <small>华为埃及开罗 CFC 办公楼 · 全年冷热负荷仿真</small>
        </div>
      </div>

      <nav className="main-nav" aria-label="主要页面">
        {PAGES.map((item) => (
          <button
            type="button"
            key={item.id}
            className={page === item.id ? 'active' : ''}
            onClick={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="topbar-right">
        <div className="weather-chip">
          <span className="weather-sun"><Icon name="sun" size={16} /></span>
          <div>
            <strong>{maxTemp} °C</strong>
            <span>开罗 · 30.12°N 31.41°E</span>
          </div>
        </div>
        <button type="button" className="btn ghost compact" onClick={onOptimize} disabled={optimizing}>
          <Icon name="refresh" size={15} className={optimizing ? 'spin' : ''} />
          {optimizing ? 'Agent 搜索中' : '重新优化'}
        </button>
        <button type="button" className="btn primary compact" onClick={onExport}>
          <Icon name="download" size={15} />
          报告
        </button>
      </div>
      {optimizing && progress?.total > 1 && (
        <div className="top-progress">
          <div style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
        </div>
      )}
    </header>
  );
}
