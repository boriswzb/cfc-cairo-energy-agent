import { createCanvas } from '@napi-rs/canvas';

const COLORS = {
  bg: '#07111c',
  panel: '#0b1a29',
  grid: 'rgba(147, 187, 219, 0.14)',
  text: '#e8f2fb',
  muted: '#8ba3b8',
  accent: '#22d3ee',
  baseline: '#f59e0b',
  optimized: '#22d3ee',
  pv: '#fbbf24',
  demand: '#f472b6',
  gridImport: '#94a3b8',
  green: '#34d399',
};

const font = (size, weight = 400) => `${weight} ${size}px "Segoe UI", "DejaVu Sans", Arial, sans-serif`;

function roundedRect(ctx, x, y, width, height, radius = 10) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function setup(width, height, title, subtitle) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);
  const gradient = ctx.createRadialGradient(width * 0.2, 0, 0, width * 0.2, 0, width * 0.9);
  gradient.addColorStop(0, 'rgba(34,211,238,0.08)');
  gradient.addColorStop(1, 'rgba(7,17,28,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = COLORS.text;
  ctx.font = font(26, 700);
  ctx.fillText(title, 54, 55);
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(13);
  ctx.fillText(subtitle, 54, 79);
  return { canvas, ctx };
}

function drawLegend(ctx, items, x, y) {
  let cursor = x;
  ctx.font = font(12, 500);
  for (const item of items) {
    ctx.fillStyle = item.color;
    roundedRect(ctx, cursor, y - 7, 16, 4, 2);
    ctx.fill();
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(item.label, cursor + 24, y);
    cursor += ctx.measureText(item.label).width + 52;
  }
}

function downsampleHourly(values, target = 1500) {
  if (values.length <= target) return values;
  const bin = Math.ceil(values.length / target);
  const result = [];
  for (let i = 0; i < values.length; i += bin) {
    let sum = 0;
    let count = 0;
    for (let j = i; j < Math.min(values.length, i + bin); j += 1) {
      sum += values[j];
      count += 1;
    }
    result.push(sum / Math.max(1, count));
  }
  return result;
}

export function renderHourlyCurve({ baseline, optimized, width = 1600, height = 620 }) {
  const { canvas, ctx } = setup(
    width,
    height,
    'CFC Cairo — Annual Hourly Cooling Load',
    'Hourly thermal cooling demand, 8,760 hours · TMYx Cairo Intl. AP',
  );
  const left = 78;
  const right = width - 40;
  const top = 130;
  const bottom = height - 62;
  const base = downsampleHourly(baseline.hourly.coolingKW);
  const opt = downsampleHourly(optimized.hourly.coolingKW);
  const maxY = Math.max(...base, ...opt) * 1.08;

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const y = bottom - ((bottom - top) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(11);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round((maxY * i) / 5)} kW`, left - 10, y + 4);
  }
  ctx.textAlign = 'left';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const cumulative = [0, 744, 1416, 2160, 2880, 3624, 4344, 5088, 5832, 6552, 7296, 8016, 8760];
  months.forEach((month, index) => {
    const x = left + ((right - left) * cumulative[index]) / 8760;
    ctx.strokeStyle = 'rgba(147,187,219,0.08)';
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(11);
    ctx.fillText(month, x + 4, bottom + 22);
  });

  const drawSeries = (values, color, fillAlpha) => {
    const points = values.map((value, index) => ({
      x: left + ((right - left) * index) / Math.max(1, values.length - 1),
      y: bottom - (value / maxY) * (bottom - top),
    }));
    if (fillAlpha) {
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(right, bottom);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, top, 0, bottom);
      gradient.addColorStop(0, `rgba(34,211,238,${fillAlpha})`);
      gradient.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    ctx.beginPath();
    points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  drawSeries(base, COLORS.baseline, 0);
  drawSeries(opt, COLORS.optimized, 0.13);
  drawLegend(ctx, [
    { label: 'Baseline cooling', color: COLORS.baseline },
    { label: 'Optimized cooling', color: COLORS.optimized },
  ], left, 108);
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(11);
  ctx.textAlign = 'right';
  ctx.fillText(`Peak ${Math.round(optimized.summary.peakCoolingKW)} kW · ${optimized.summary.coolingIntensityKWhM2.toFixed(1)} kWh/m²`, right, height - 22);
  return canvas.toBuffer('image/png');
}

export function renderMonthlyComparison({ baseline, optimized, width = 1400, height = 620 }) {
  const { canvas, ctx } = setup(
    width,
    height,
    'CFC Cairo — Monthly Cooling Demand',
    'Baseline vs optimized envelope · thermal cooling demand',
  );
  const left = 78;
  const right = width - 40;
  const top = 135;
  const bottom = height - 74;
  const maxY = Math.max(...baseline.monthly.map((m) => m.coolingMWh), ...optimized.monthly.map((m) => m.coolingMWh)) * 1.12;
  const groupWidth = (right - left) / 12;
  ctx.strokeStyle = COLORS.grid;
  for (let i = 0; i <= 5; i += 1) {
    const y = bottom - ((bottom - top) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(11);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round((maxY * i) / 5)}`, left - 10, y + 4);
  }
  ctx.textAlign = 'center';
  baseline.monthly.forEach((month, index) => {
    const x = left + groupWidth * index + groupWidth / 2;
    const h1 = (month.coolingMWh / maxY) * (bottom - top);
    const h2 = (optimized.monthly[index].coolingMWh / maxY) * (bottom - top);
    const barWidth = Math.min(34, groupWidth * 0.3);
    ctx.fillStyle = COLORS.baseline;
    roundedRect(ctx, x - barWidth - 3, bottom - h1, barWidth, h1, 3);
    ctx.fill();
    ctx.fillStyle = COLORS.optimized;
    roundedRect(ctx, x + 3, bottom - h2, barWidth, h2, 3);
    ctx.fill();
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(11);
    ctx.fillText(month.name.replace('月', ''), x, bottom + 22);
  });
  drawLegend(ctx, [
    { label: 'Baseline', color: COLORS.baseline },
    { label: 'Optimized', color: COLORS.optimized },
  ], left, 108);
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(11);
  ctx.textAlign = 'right';
  ctx.fillText('MWh / month', right, height - 24);
  return canvas.toBuffer('image/png');
}

export function renderPvMatching({ result, width = 1400, height = 620 }) {
  const { canvas, ctx } = setup(
    width,
    height,
    'CFC Cairo — PV / Building Demand Matching',
    'Average July day · 160 kWp rooftop PV',
  );
  const left = 78;
  const right = width - 40;
  const top = 135;
  const bottom = height - 72;
  const demand = result.pv.julyProfile.map((slot) => slot.demand);
  const pv = result.pv.julyProfile.map((slot) => slot.pv);
  const maxY = Math.max(...demand, ...pv) * 1.12;
  ctx.strokeStyle = COLORS.grid;
  for (let i = 0; i <= 5; i += 1) {
    const y = bottom - ((bottom - top) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(11);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round((maxY * i) / 5)} kW`, left - 10, y + 4);
  }
  const x = (hour) => left + ((right - left) * hour) / 23;
  for (let hour = 0; hour < 24; hour += 3) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(11);
    ctx.textAlign = 'center';
    ctx.fillText(`${String(hour).padStart(2, '0')}:00`, x(hour), bottom + 22);
  }
  const draw = (values, color, widthLine = 2.4) => {
    ctx.beginPath();
    values.forEach((value, hour) => {
      const y = bottom - (value / maxY) * (bottom - top);
      if (hour === 0) ctx.moveTo(x(hour), y);
      else ctx.lineTo(x(hour), y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = widthLine;
    ctx.stroke();
  };
  draw(demand, COLORS.demand);
  draw(pv, COLORS.pv, 2.8);
  draw(demand.map((value, hour) => Math.max(0, value - pv[hour])), COLORS.gridImport, 1.6);
  drawLegend(ctx, [
    { label: 'Building demand', color: COLORS.demand },
    { label: 'PV generation', color: COLORS.pv },
    { label: 'Grid import', color: COLORS.gridImport },
  ], left, 108);
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(11);
  ctx.textAlign = 'right';
  ctx.fillText(
    `Self-consumption ${(result.summary.pvSelfConsumptionRatio * 100).toFixed(1)}% · Self-sufficiency ${(result.summary.pvSelfSufficiencyRatio * 100).toFixed(1)}%`,
    right,
    height - 24,
  );
  return canvas.toBuffer('image/png');
}

export function renderPareto({ points, baseline, recommended, width = 1400, height = 620 }) {
  const { canvas, ctx } = setup(
    width,
    height,
    'CFC Cairo — Envelope Optimization Pareto Front',
    'Annual cooling demand vs PV self-consumption · fast screening',
  );
  const left = 86;
  const right = width - 44;
  const top = 135;
  const bottom = height - 74;
  const xs = points.map((point) => point.coolingMWh);
  const ys = points.map((point) => point.selfConsumptionRatio * 100);
  const minX = Math.min(...xs, baseline.summary.annualCoolingMWh) * 0.98;
  const maxX = Math.max(...xs, baseline.summary.annualCoolingMWh) * 1.02;
  const minY = Math.min(...ys) * 0.995;
  const maxY = Math.max(...ys) * 1.005;
  const px = (value) => left + ((value - minX) / Math.max(1, maxX - minX)) * (right - left);
  const py = (value) => bottom - ((value - minY) / Math.max(0.001, maxY - minY)) * (bottom - top);
  ctx.strokeStyle = COLORS.grid;
  for (let i = 0; i <= 5; i += 1) {
    const y = bottom - ((bottom - top) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(11);
    ctx.textAlign = 'right';
    ctx.fillText(`${(minY + ((maxY - minY) * i) / 5).toFixed(1)}%`, left - 10, y + 4);
  }
  for (const point of points) {
    ctx.beginPath();
    ctx.arc(px(point.coolingMWh), py(point.selfConsumptionRatio * 100), 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(34,211,238,0.35)';
    ctx.fill();
  }
  const bx = px(baseline.summary.annualCoolingMWh);
  const by = py(baseline.summary.pvSelfConsumptionRatio * 100);
  ctx.beginPath();
  ctx.arc(bx, by, 6, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.baseline;
  ctx.fill();
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(11);
  ctx.fillText('Baseline', bx + 10, by - 10);
  const rx = px(recommended.summary.annualCoolingMWh);
  const ry = py(recommended.summary.pvSelfConsumptionRatio * 100);
  ctx.beginPath();
  ctx.arc(rx, ry, 6, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.green;
  ctx.fill();
  ctx.fillText('Recommended', rx + 10, ry + 16);
  drawLegend(ctx, [
    { label: 'Candidate', color: 'rgba(34,211,238,0.35)' },
    { label: 'Recommended', color: COLORS.green },
    { label: 'Baseline', color: COLORS.baseline },
  ], left, 108);
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(11);
  ctx.textAlign = 'center';
  ctx.fillText('Annual cooling MWh', (left + right) / 2, height - 28);
  return canvas.toBuffer('image/png');
}
