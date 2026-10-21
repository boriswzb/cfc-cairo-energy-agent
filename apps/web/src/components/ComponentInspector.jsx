import React from 'react';
import {
  BUILDING,
  GLAZING_TYPES,
  SHADING_STRATEGIES,
  orientationLabel,
} from '@cfc/energy-core';
import { Icon } from './Icons.jsx';
import { formatNumber, formatPercent } from '../lib/format.js';

function Row({ label, value }) {
  return (
    <div className="inspector-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function ComponentInspector({ selection, result, onClose }) {
  const { kind, floor, orientation, zone, part } = selection;
  const floorMeta = typeof floor === 'number' ? BUILDING.floors[floor] : null;
  const design = result.design;
  const wall = result.envelope.wall;
  const glazing = GLAZING_TYPES[design.glazing];
  const shading = SHADING_STRATEGIES[design.shading];
  const floorResult = typeof floor === 'number' ? result.floors[floor] : null;

  let title = '建筑构件';
  let subtitle = '';
  let icon = 'building';
  let rows = [];

  if (kind === 'wall') {
    title = '节能保温外墙';
    subtitle = `${floorMeta?.short ?? ''} · ${orientationLabel(orientation ?? 'south')}向`;
    icon = 'layers';
    rows = [
      ['构造', `${design.wallInsulationMm} mm 保温 + 200 mm 混凝土`],
      ['传热系数 U', `${formatNumber(wall.uValue, 3)} W/(m²·K)`],
      ['总厚度', `${formatNumber(wall.thickness * 1000, 0)} mm`],
      ['面密度', `${formatNumber(wall.mass, 0)} kg/m²`],
      ['全楼外墙全年传热', `${formatNumber(result.components.wall, 1)} MWh`],
    ];
  } else if (kind === 'window') {
    title = 'Low-E 低辐射外窗';
    subtitle = `${floorMeta?.short ?? ''} · ${orientationLabel(orientation ?? 'south')}向 · WWR ${formatPercent(design.wwr, 0)}`;
    icon = 'window';
    rows = [
      ['玻璃', glazing.name],
      ['U 值', `${formatNumber(glazing.uValue, 2)} W/(m²·K)`],
      ['SHGC', formatNumber(glazing.shgc, 2)],
      ['可见光透过率', formatPercent(glazing.vlt, 0)],
      ['全楼外窗太阳得热', `${formatNumber(result.components.solar, 1)} MWh`],
      ['外窗传热', `${formatNumber(result.components.windowConduction, 1)} MWh`],
    ];
  } else if (kind === 'shading') {
    title = '可调节外遮阳';
    subtitle = `${floorMeta?.short ?? ''} · ${orientationLabel(orientation ?? 'south')}向百叶`;
    icon = 'shade';
    rows = [
      ['策略', shading.name],
      ['控制', shading.note],
      ['全楼外窗太阳得热', `${formatNumber(result.components.solar, 1)} MWh`],
      ['遮阳状态', '按 4–10 月高辐照时段动态调节'],
    ];
  } else if (kind === 'pv') {
    title = '屋顶光伏方阵';
    subtitle = '160 kWp · 20° 南向';
    icon = 'solar';
    rows = [
      ['装机容量', `${formatNumber(result.pv.capacityKWp, 0)} kWp`],
      ['年发电量', `${formatNumber(result.summary.pvYieldMWh, 1)} MWh`],
      ['自消纳率', formatPercent(result.summary.pvSelfConsumptionRatio, 1)],
      ['建筑用电自给率', formatPercent(result.summary.pvSelfSufficiencyRatio, 1)],
      ['单位容量发电', `${formatNumber(result.summary.specificYieldKWhPerKWp, 0)} kWh/kWp`],
      ['年减碳', `${formatNumber(result.summary.co2AvoidedTonnes, 1)} tCO₂`],
    ];
  } else if (kind === 'openlab') {
    title = 'Openlab 小型机房';
    subtitle = '1F · 24/7 独立精密空调';
    icon = 'server';
    rows = [
      ['面积', `${formatNumber(result.openlab.area, 0)} m²`],
      ['IT 热负荷', `${formatNumber(result.openlab.itLoadKW, 1)} kW`],
      ['UPS 散热', `${formatNumber(result.openlab.upsLossKW, 1)} kW`],
      ['全年制冷需求', `${formatNumber(result.openlab.coolingMWh, 1)} MWh`],
      ['峰值冷负荷', `${formatNumber(result.openlab.peakKW, 1)} kW`],
      ['送风设定点', `${formatNumber(result.openlab.setpointC, 0)} °C`],
    ];
  } else if (kind === 'zone') {
    title = zone?.name ?? '房间分区';
    subtitle = `${floorMeta?.short ?? ''} · ${zone?.profile?.label ?? ''}`;
    icon = 'zone';
    const zoneResult = floorResult?.zones?.find((item) => item.id === zone?.id);
    rows = [
      ['面积', `${formatNumber(zone?.area, 1)} m²`],
      ['全年冷负荷', `${formatNumber(zoneResult?.annualCoolingMWh, 1)} MWh`],
      ['峰值冷负荷', `${formatNumber(zoneResult?.peakKW, 1)} kW`],
      ['人员密度', `${formatNumber(zone?.profile?.peopleDensity, 2)} 人/m²`],
      ['照明 / 设备', `${formatNumber(zone?.profile?.lightingWm2, 1)} / ${formatNumber(zone?.profile?.equipmentWm2, 1)} W/m²`],
    ];
  } else if (kind === 'core') {
    title = part ?? '电梯厅 / 洗手间核心筒';
    subtitle = `${floorMeta?.short ?? ''} · 每层一致布局`;
    icon = 'elevator';
    rows = [
      ['核心筒面积', `${formatNumber(BUILDING.coreArea, 0)} m²`],
      ['布置', part ? `${part} · 电梯居中，男/女洗手间分列左右` : '电梯居中，男/女洗手间分列左右'],
      ['通风', '机械排风'],
    ];
  }

  return (
    <aside className="component-inspector">
      <div className="inspector-head">
        <div className="inspector-icon">
          <Icon name={icon} size={19} />
        </div>
        <div>
          <span className="eyebrow">CONSTRUCTION INSPECTOR</span>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭构件详情">
          <Icon name="close" size={17} />
        </button>
      </div>
      <div className="inspector-rows">
        {rows.map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
      </div>
      <div className="inspector-foot">
        <Icon name="info" size={13} />
        数据来自全年逐时热工模型；修改方案后会自动更新。
      </div>
    </aside>
  );
}
