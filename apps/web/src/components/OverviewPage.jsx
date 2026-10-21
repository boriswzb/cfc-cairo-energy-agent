import React from 'react';
import { Icon } from './Icons.jsx';
import { BuildingViewer } from './BuildingViewer.jsx';
import { HourlyChart } from '../charts/HourlyChart.jsx';
import { MonthlyChart } from '../charts/MonthlyChart.jsx';
import {
  AgentSummary,
  BreakdownCard,
  FloorLoadChart,
  KpiCard,
  SchemeCompareMini,
  ValidationCard,
} from './OverviewCards.jsx';
import { formatNumber, formatPercent } from '../lib/format.js';

export function OverviewPage({
  optimization,
  viewOptimization,
  current,
  savings,
  metadata,
  selectedFloor,
  onFloorChange,
  selectedComponent,
  onSelectComponent,
  onCloseComponent,
  onOpenEnvelope,
  onNavigate,
}) {
  const baseline = viewOptimization.baseline;
  const coolingDelta = -savings.coolingPct;
  const peakDelta = -savings.peakPct;
  const electricityDelta = -savings.electricityPct;
  return (
    <div className="page overview-page">
      <header className="overview-hero">
        <div className="hero-copy">
          <span className="eyebrow"><Icon name="activity" size={13} /> ANNUAL THERMAL DIGITAL TWIN</span>
          <h1>让每一度冷量，<em>都有来源。</em></h1>
          <p>
            基于开罗 8,760 小时 TMYx 气象，逐时求解六层办公楼的围护传热、太阳得热、人员/设备/新风负荷与屋顶光伏，
            并用 Agent 搜索更优围护组合。
          </p>
          <div className="hero-tags">
            <span><i /> 6 层 / 7,290 m²</span>
            <span><i /> BWh 干热沙漠</span>
            <span><i /> 160 kWp 屋顶光伏</span>
            <span><i /> Openlab 独立计量</span>
          </div>
        </div>
        <div className="hero-weather">
          <div className="weather-ring">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="49" fill="none" stroke="rgba(246,183,60,.16)" strokeWidth="7" />
              <circle cx="60" cy="60" r="49" fill="none" stroke="#f6b73c" strokeWidth="7" strokeDasharray="150 310" strokeLinecap="round" transform="rotate(-90 60 60)" />
            </svg>
            <div><strong>{formatNumber(metadata?.annual?.tdbMax ?? 42.4, 1)}°</strong><span>极端高温</span></div>
          </div>
          <div className="weather-detail">
            <span>年均 {formatNumber(metadata?.annual?.tdbMean ?? 22.1, 1)} °C</span>
            <span>GHI {formatNumber(metadata?.annual?.ghiTotalKwhM2 ?? 2148, 0)} kWh/m²</span>
            <span>制冷度日 {formatNumber(metadata?.annual?.coolingDegreeDays18 ?? 0, 0)}</span>
          </div>
        </div>
      </header>

      <section className="kpi-row">
        <KpiCard
          label="全年制冷需求"
          value={formatNumber(current.summary.annualCoolingMWh, 1)}
          unit="MWh"
          delta={`${formatNumber(coolingDelta, 1)}%`}
          note="对比基准方案"
          tone="cyan"
          icon="snow"
        />
        <KpiCard
          label="峰值冷负荷"
          value={formatNumber(current.summary.peakCoolingKW, 1)}
          unit="kW"
          delta={`${formatNumber(peakDelta, 1)}%`}
          note={`${formatNumber(current.summary.peakCoolingIntensityWm2, 1)} W/m² 峰值强度`}
          tone="gold"
          icon="bolt"
        />
        <KpiCard
          label="冷负荷强度"
          value={formatNumber(current.summary.coolingIntensityKWhM2, 1)}
          unit="kWh/m²"
          note="埃及办公建筑对标"
          tone="blue"
          icon="target"
        />
        <KpiCard
          label="光伏年发电"
          value={formatNumber(current.summary.pvYieldMWh, 1)}
          unit="MWh"
          note={`${formatNumber(current.summary.specificYieldKWhPerKWp, 0)} kWh/kWp`}
          tone="gold"
          icon="sun"
        />
        <KpiCard
          label="光伏自消纳"
          value={formatNumber(current.summary.pvSelfConsumptionRatio * 100, 1)}
          unit="%"
          note="屋顶 160 kWp · 南向 20°"
          tone="green"
          icon="activity"
        />
        <KpiCard
          label="建筑用电"
          value={formatNumber(current.summary.annualBuildingElectricityMWh, 1)}
          unit="MWh"
          delta={`${formatNumber(electricityDelta, 1)}%`}
          note="含冷热源、照明、IT"
          tone="violet"
          icon="chart"
        />
      </section>

      <div className="overview-layout">
        <div className="overview-main">
          <BuildingViewer
            result={current}
            selectedFloor={selectedFloor}
            onFloorChange={onFloorChange}
            selectedComponent={selectedComponent}
            onSelectComponent={onSelectComponent}
            onCloseComponent={onCloseComponent}
          />
          <HourlyChart baseline={viewOptimization.baseline} optimized={current} />
        </div>
        <aside className="overview-side">
          <AgentSummary
            optimization={optimization}
            current={current}
            onOpenEnvelope={onOpenEnvelope}
          />
          <BreakdownCard result={current} />
          <ValidationCard result={current} />
        </aside>
      </div>

      <div className="overview-bottom">
        <MonthlyChart baseline={viewOptimization.baseline} optimized={current} compact />
        <FloorLoadChart
          result={current}
          onFloorSelect={(level) => {
            onFloorChange(level);
            onNavigate('overview');
          }}
        />
        <SchemeCompareMini baseline={viewOptimization.baseline} optimized={current} savings={savings} />
      </div>
    </div>
  );
}
