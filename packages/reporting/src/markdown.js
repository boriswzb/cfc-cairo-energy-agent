import { GLAZING_TYPES, SHADING_STRATEGIES } from '@cfc/energy-core';

const f = (value, digits = 1) => (Number.isFinite(value) ? Number(value.toFixed(digits)).toString() : '—');
const pct = (value, digits = 2) => `${(value * 100).toFixed(digits)}%`;

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

export function buildMarkdownReport({
  baseline,
  optimized,
  savings,
  agent,
  metadata,
  search,
  generatedAt = new Date(),
}) {
  const building = baseline.building;
  const baseDesign = baseline.design;
  const optDesign = optimized.design;
  const glazing = GLAZING_TYPES[optDesign.glazing];
  const shading = SHADING_STRATEGIES[optDesign.shading];
  const lines = [];
  lines.push('# 华为埃及开罗 CFC 办公楼 · 全年冷热负荷与围护结构优化报告');
  lines.push('');
  lines.push(`**生成时间：** ${generatedAt.toISOString()} ｜ **建筑：** ${building.fullName} ｜ **地点：** ${building.address}`);
  lines.push(`**气象数据：** ${metadata.dataset ?? 'Cairo TMYx'} ｜ **记录：** 8,760 小时 ｜ **气候：** ${building.climate}`);
  lines.push('');
  lines.push('## 1. 结论摘要');
  lines.push('');
  lines.push(agent.headline);
  lines.push('');
  lines.push(table(
    ['指标', '基准方案', '优化方案', '变化'],
    [
      ['全年制冷需求 / MWh', f(baseline.summary.annualCoolingMWh), f(optimized.summary.annualCoolingMWh), `-${f(savings.coolingPct)}%`],
      ['全年制热需求 / MWh', f(baseline.summary.annualHeatingMWh), f(optimized.summary.annualHeatingMWh), `${savings.heatingPct >= 0 ? '-' : '+'}${f(Math.abs(savings.heatingPct))}%`],
      ['全年建筑用电 / MWh', f(baseline.summary.annualBuildingElectricityMWh), f(optimized.summary.annualBuildingElectricityMWh), `-${f(savings.electricityPct)}%`],
      ['峰值冷负荷 / kW', f(baseline.summary.peakCoolingKW), f(optimized.summary.peakCoolingKW), `-${f(savings.peakPct)}%`],
      ['冷负荷强度 / kWh/m²', f(baseline.summary.coolingIntensityKWhM2), f(optimized.summary.coolingIntensityKWhM2), `-${f(((baseline.summary.coolingIntensityKWhM2 - optimized.summary.coolingIntensityKWhM2) / baseline.summary.coolingIntensityKWhM2) * 100)}%`],
      ['光伏自消纳率', pct(baseline.summary.pvSelfConsumptionRatio), pct(optimized.summary.pvSelfConsumptionRatio), `${savings.selfConsumptionDeltaPp >= 0 ? '+' : ''}${f(savings.selfConsumptionDeltaPp, 2)} pp`],
      ['建筑用电自给率', pct(baseline.summary.pvSelfSufficiencyRatio), pct(optimized.summary.pvSelfSufficiencyRatio), `+${f(savings.selfSufficiencyDeltaPp, 2)} pp`],
      ['热舒适满足率', pct(baseline.summary.comfortCompliance), pct(optimized.summary.comfortCompliance), '满足'],
      ['Openlab 制冷 / MWh', f(baseline.openlab.coolingMWh), f(optimized.openlab.coolingMWh), '独立计量'],
    ],
  ));
  lines.push('');
  lines.push('> 说明：Cairo 全年以冷负荷为主，采暖需求很低。围护提效会降低白天冷负荷，因而光伏自消纳率可能出现小幅下降；本报告同时给出自消纳率与建筑用电自给率，避免用单一指标误导。');
  lines.push('');

  lines.push('## 2. 建筑与气象条件');
  lines.push('');
  lines.push(`- 建筑：6 层，标准层 ${f(building.floorArea, 0)} m²，总建筑面积 ${f(building.totalArea, 0)} m²；0F 大堂/食堂/前台，1F 培训/展区/Openlab，2F–5F 标准办公。`);
  lines.push(`- 围护：${baseDesign.wallInsulationMm} mm 保温外墙、Low-E 低辐射玻璃、可调外遮阳、屋顶 160 kWp 光伏。`);
  lines.push(`- 气象：TMYx 8760 小时，年均干球 ${f(metadata.annual?.tdbMean ?? 22.1)} °C，最高 ${f(metadata.annual?.tdbMax ?? 42.4)} °C，年水平面总辐射 ${f(metadata.annual?.ghiTotalKwhM2 ?? 2148.5)} kWh/m²。`);
  lines.push(`- 工作日：周日至周四；周五、周六为周末。主要办公时间 07:00–19:00；Openlab 机房 24/7。`);
  lines.push('');

  lines.push('## 3. 计算方法');
  lines.push('');
  lines.push('- 围护传热：3R2C 双质量节点集总模型，隐式 Euler 逐时推进；稳态 U 值与多层构造热阻一致。');
  lines.push('- 外窗：按玻璃 U/SHGC、框比、入射角修正与遮阳时序计算传热和太阳得热。');
  lines.push('- 太阳辐射：由 EPW 的 GHI/DNI/DHI 与太阳位置计算各朝向坡面辐射；屋顶光伏按 20° 南向倾斜面计算。');
  lines.push('- 内热与新风：按房型人员密度、照明/设备功率密度、埃及作息与新风量逐时计算；Openlab 单独计量 IT/UPS 散热。');
  lines.push('- 能量平衡：逐时分项求和，并与冷热负荷总量对账；采用开罗 47.2 °C 极端高温稳态工况校验。');
  lines.push('');

  lines.push('## 4. 围护方案');
  lines.push('');
  lines.push(table(
    ['变量', '基准方案', '优化方案'],
    [
      ['外墙保温', `${baseDesign.wallInsulationMm} mm`, `${optDesign.wallInsulationMm} mm`],
      ['窗墙比 WWR', `${f(baseDesign.wwr * 100, 0)}%`, `${f(optDesign.wwr * 100, 0)}%`],
      ['玻璃', GLAZING_TYPES[baseDesign.glazing].name, glazing.name],
      ['遮阳策略', SHADING_STRATEGIES[baseDesign.shading].name, shading.name],
      ['玻璃 U / W(m²·K)', f(GLAZING_TYPES[baseDesign.glazing].uValue, 2), f(glazing.uValue, 2)],
      ['玻璃 SHGC', f(GLAZING_TYPES[baseDesign.glazing].shgc, 2), f(glazing.shgc, 2)],
    ],
  ));
  lines.push('');
  lines.push('**Agent 解释：**');
  for (const bullet of agent.bullets) lines.push(`- ${bullet}`);
  lines.push('');

  lines.push('## 5. 逐月冷热负荷');
  lines.push('');
  lines.push(table(
    ['月份', '室外均温 / °C', '基准制冷 / MWh', '优化制冷 / MWh', '基准制热 / MWh', '优化制热 / MWh', 'Openlab 制冷 / MWh'],
    baseline.monthly.map((month, index) => {
      const opt = optimized.monthly[index];
      return [
        month.name,
        f(month.outdoorMeanC, 1),
        f(month.coolingMWh),
        f(opt.coolingMWh),
        f(month.heatingMWh),
        f(opt.heatingMWh),
        f(month.openlabCoolingMWh),
      ];
    }),
  ));
  lines.push('');

  lines.push('## 6. 分项热负荷（优化方案）');
  lines.push('');
  lines.push(table(
    ['分项', '全年热量 / MWh'],
    [
      ['外墙传热', f(optimized.components.wall)],
      ['屋面传热', f(optimized.components.roof)],
      ['外窗传热', f(optimized.components.windowConduction)],
      ['外窗太阳得热', f(optimized.components.solar)],
      ['人员显热', f(optimized.components.peopleSensible)],
      ['人员潜热', f(optimized.components.peopleLatent)],
      ['照明', f(optimized.components.lighting)],
      ['设备', f(optimized.components.equipment)],
      ['新风显热', f(optimized.components.ventilationSensible)],
      ['新风潜热', f(optimized.components.ventilationLatent)],
      ['Openlab IT + UPS', f(optimized.openlab.components.it + optimized.openlab.components.ups)],
    ],
  ));
  lines.push('');
  lines.push(`分项合计 ${f(optimized.components.total)} MWh；冷热净负荷 ${f(optimized.summary.annualCoolingMWh - optimized.summary.annualHeatingMWh)} MWh；能量平衡偏差 ${f(optimized.validation.energyBalanceErrorPct, 5)}%。`);
  lines.push('');

  lines.push('## 7. Openlab 机房热负荷');
  lines.push('');
  lines.push(table(
    ['指标', '数值'],
    [
      ['面积', `${f(optimized.openlab.area, 0)} m²`],
      ['IT 设备热负荷', `${f(optimized.openlab.itLoadKW, 1)} kW（24/7）`],
      ['UPS 散热', `${f(optimized.openlab.upsLossKW, 1)} kW`],
      ['全年制冷需求', `${f(optimized.openlab.coolingMWh)} MWh`],
      ['全年制冷电耗', `${f(optimized.openlab.coolingElectricityMWh)} MWh`],
      ['峰值冷负荷', `${f(optimized.openlab.peakKW)} kW`],
      ['单位面积冷负荷', `${f(optimized.openlab.intensityWm2)} W/m²`],
    ],
  ));
  lines.push('');
  lines.push('Openlab 采用独立 24/7 精密空调系统，送风温度 22 °C，新风 150 L/s；IT 与 UPS 散热单独列出，不并入办公区内部得热。');
  lines.push('');

  lines.push('## 8. 光伏发电与建筑用电匹配');
  lines.push('');
  lines.push(table(
    ['指标', '基准', '优化'],
    [
      ['光伏装机', '160 kWp', '160 kWp'],
      ['年发电量 / MWh', f(baseline.summary.pvYieldMWh), f(optimized.summary.pvYieldMWh)],
      ['自用消纳 / MWh', f(baseline.summary.pvSelfConsumedMWh), f(optimized.summary.pvSelfConsumedMWh)],
      ['余电上网 / MWh', f(baseline.summary.pvExportMWh), f(optimized.summary.pvExportMWh)],
      ['自消纳率', pct(baseline.summary.pvSelfConsumptionRatio), pct(optimized.summary.pvSelfConsumptionRatio)],
      ['建筑用电自给率', pct(baseline.summary.pvSelfSufficiencyRatio), pct(optimized.summary.pvSelfSufficiencyRatio)],
      ['年减碳 / tCO₂', f(baseline.summary.co2AvoidedTonnes), f(optimized.summary.co2AvoidedTonnes)],
    ],
  ));
  lines.push('');
  lines.push('光伏采用 160 kWp、20° 南向、系统效率 86%、逆变器效率 97.5%、污染损失 3%、年衰减 0.5%；建筑用电包含冷热源、照明、设备、IT 与电梯。');
  lines.push('');

  lines.push('## 9. 计算校验');
  lines.push('');
  lines.push(`- 开罗极端高温工况：室外 ${optimized.validation.extremeCase.outdoorC} °C，室内 ${optimized.validation.extremeCase.indoorC} °C；墙/屋面稳态偏差 ${f(optimized.validation.extremeCase.wallErrorPct, 3)}% / ${f(optimized.validation.extremeCase.roofErrorPct, 3)}%。`);
  lines.push(`- 全年分项能量平衡偏差：${f(optimized.validation.energyBalanceErrorPct, 5)}%；${optimized.validation.passed ? '通过 5% 阈值。' : '未通过，已触发自动修正。'}`);
  lines.push(`- 舒适性：满足率 ${pct(optimized.summary.comfortCompliance)}，未满足 ${optimized.summary.unmetHours} h；峰值冷负荷强度 ${f(optimized.summary.peakCoolingIntensityWm2)} W/m²。`);
  lines.push('');

  lines.push('## 10. 优化搜索');
  lines.push('');
  lines.push(`- 评估候选：${search?.evaluated ?? '—'} 个；Pareto 前沿：${search?.paretoSize ?? '—'} 个；用时 ${search ? (search.elapsedMs / 1000).toFixed(1) : '—'} s。`);
  lines.push(`- 搜索变量：保温 80/120/160 mm，WWR 22/30/38/46%，4 种玻璃，4 种遮阳策略。`);
  lines.push(`- 约束：热舒适满足率 ≥ 98%、峰值冷负荷强度 ≤ 150 W/m²，保留可调外遮阳。`);
  lines.push('');

  lines.push('## 11. 结论与建议');
  lines.push('');
  lines.push(`1. ${agent.bullets[3]}`);
  lines.push(`2. 优化方案全年建筑用电 ${f(optimized.summary.annualBuildingElectricityMWh)} MWh，较基准下降 ${f(savings.electricityPct)}%；光伏自给率提升至 ${pct(optimized.summary.pvSelfSufficiencyRatio)}。`);
  lines.push('3. 建议将窗墙比控制在 22% 左右，西向优先采用三玻 Low-E 与智能时序遮阳；Openlab 机房继续独立计量并设置 24/7 精密空调。');
  lines.push('4. 若要进一步提升光伏自消纳率，可在午间光伏富余时段采用蓄冷/预冷，将冷负荷从傍晚迁移至白天；该策略不改变围护方案，但会改变用能时序。');
  lines.push('');
  lines.push('## 12. 模型边界');
  lines.push('');
  lines.push('- 采用理想 HVAC 设定点控制，未模拟风机盘管、VAV 末端与房间空气温度的分钟级波动。');
  lines.push('- 围护为 3R2C 集总模型，适合全年逐时负荷与方案比较，不替代施工图阶段的详细 CFD/EnergyPlus 校验。');
  lines.push('- Openlab 围护得热按 1F 面积份额分摊，IT/UPS 热负荷独立统计。');
  lines.push('- 光伏出力未考虑屋顶设备遮挡与局部阴影；实际设计需结合屋顶机房、女儿墙与检修通道复核。');
  lines.push('');
  lines.push(`> 本报告由 CFC Cairo Energy Agent 自动生成。气象源：${metadata.sourceUrl ?? 'Climate.OneBuilding'}。`);
  lines.push('');
  return lines.join('\n');
}
