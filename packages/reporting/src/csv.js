function csvValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers, rows) {
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(',')),
  ].join('\n') + '\n';
}

const round = (value, digits = 3) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : '');

export function hourlyCsv(result) {
  const headers = [
    'timestamp',
    'outdoor_C',
    'GHI_Wm2',
    'cooling_kW',
    'heating_kW',
    'openlab_cooling_kW',
    'cooling_electricity_kW',
    'heating_electricity_kW',
    'building_demand_kW',
    'pv_kW',
    'pv_self_consumed_kW',
    'grid_import_kW',
    'grid_export_kW',
  ];
  const rows = result.hourly.time.map((timestamp, index) => ({
    timestamp,
    outdoor_C: round(result.hourly.outdoorC[index], 2),
    GHI_Wm2: round(result.hourly.ghi[index], 1),
    cooling_kW: round(result.hourly.coolingKW[index], 3),
    heating_kW: round(result.hourly.heatingKW[index], 3),
    openlab_cooling_kW: round(result.hourly.openlabKW[index], 3),
    cooling_electricity_kW: round(result.hourly.coolingElecKW[index], 3),
    heating_electricity_kW: round(result.hourly.heatingElecKW[index], 3),
    building_demand_kW: round(result.hourly.demandKW[index], 3),
    pv_kW: round(result.hourly.pvKW[index], 3),
    pv_self_consumed_kW: round(result.hourly.pvSelfKW[index], 3),
    grid_import_kW: round(result.hourly.gridImportKW[index], 3),
    grid_export_kW: round(result.hourly.gridExportKW[index], 3),
  }));
  return toCsv(headers, rows);
}

export function monthlyCsv(result) {
  const headers = [
    'month',
    'cooling_MWh',
    'heating_MWh',
    'cooling_electricity_MWh',
    'heating_electricity_MWh',
    'openlab_cooling_MWh',
    'it_MWh',
    'demand_MWh',
    'pv_yield_MWh',
    'pv_self_consumed_MWh',
    'pv_export_MWh',
    'grid_import_MWh',
    'outdoor_mean_C',
  ];
  const rows = result.monthly.map((item) => ({
    month: item.month,
    cooling_MWh: round(item.coolingMWh, 3),
    heating_MWh: round(item.heatingMWh, 3),
    cooling_electricity_MWh: round(item.coolingElectricityMWh, 3),
    heating_electricity_MWh: round(item.heatingElectricityMWh, 3),
    openlab_cooling_MWh: round(item.openlabCoolingMWh, 3),
    it_MWh: round(item.itMWh, 3),
    demand_MWh: round(item.demandMWh, 3),
    pv_yield_MWh: round(item.pvYieldMWh, 3),
    pv_self_consumed_MWh: round(item.pvSelfMWh, 3),
    pv_export_MWh: round(item.pvExportMWh, 3),
    grid_import_MWh: round(item.gridImportMWh, 3),
    outdoor_mean_C: round(item.outdoorMeanC, 1),
  }));
  return toCsv(headers, rows);
}

export function openlabCsv(result) {
  const monthly = result.monthly.map((item) => ({
    month: item.month,
    openlab_cooling_MWh: round(item.openlabCoolingMWh, 3),
  }));
  return toCsv(['month', 'openlab_cooling_MWh'], monthly);
}

export function openlabComponentsCsv(result) {
  const headers = ['component', 'MWh'];
  const rows = Object.entries(result.openlab.components).map(([component, value]) => ({
    component,
    MWh: round(value, 3),
  }));
  return toCsv(headers, rows);
}

export function floorCsv(result) {
  const headers = ['floor', 'name', 'area_m2', 'cooling_MWh', 'heating_MWh', 'peak_cooling_kW', 'peak_intensity_Wm2'];
  const rows = result.floors.map((floor) => ({
    floor: floor.level,
    name: floor.name,
    area_m2: floor.area,
    cooling_MWh: round(floor.coolingMWh, 3),
    heating_MWh: round(floor.heatingMWh, 3),
    peak_cooling_kW: round(floor.peakCoolingKW, 3),
    peak_intensity_Wm2: round(floor.peakIntensityWm2, 2),
  }));
  return toCsv(headers, rows);
}

export function comparisonCsv({ baseline, optimized, savings }) {
  const headers = ['metric', 'baseline', 'optimized', 'savings_pct'];
  const values = [
    ['annual_cooling_MWh', round(baseline.summary.annualCoolingMWh, 2), round(optimized.summary.annualCoolingMWh, 2), round(savings.coolingPct, 2)],
    ['annual_heating_MWh', round(baseline.summary.annualHeatingMWh, 2), round(optimized.summary.annualHeatingMWh, 2), round(savings.heatingPct, 2)],
    ['annual_building_electricity_MWh', round(baseline.summary.annualBuildingElectricityMWh, 2), round(optimized.summary.annualBuildingElectricityMWh, 2), round(savings.electricityPct, 2)],
    ['peak_cooling_kW', round(baseline.summary.peakCoolingKW, 2), round(optimized.summary.peakCoolingKW, 2), round(savings.peakPct, 2)],
    ['pv_self_consumption_ratio', round(baseline.summary.pvSelfConsumptionRatio, 4), round(optimized.summary.pvSelfConsumptionRatio, 4), ''],
    ['pv_self_sufficiency_ratio', round(baseline.summary.pvSelfSufficiencyRatio, 4), round(optimized.summary.pvSelfSufficiencyRatio, 4), ''],
  ];
  const rows = values.map(([metric, base, opt, saving]) => ({
    metric,
    baseline: base,
    optimized: opt,
    savings_pct: saving,
  }));
  return toCsv(headers, rows);
}

export { toCsv };
