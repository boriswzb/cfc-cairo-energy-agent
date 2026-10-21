export function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  return Number(value.toFixed(digits)).toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDelta(value, digits = 1, suffix = '%') {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

export function formatSignedPp(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)} pp`;
}

export function formatTime(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleString('zh-CN', { hour12: false });
}

export function classNames(...values) {
  return values.filter(Boolean).join(' ');
}
