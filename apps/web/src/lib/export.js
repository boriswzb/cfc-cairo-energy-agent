export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadText(filename, text, type = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type }), filename);
}

export async function exportSvgAsPng(
  svg,
  filename,
  { scale = 2, background = '#07111c', title = '', subtitle = '' } = {},
) {
  if (!svg) throw new Error('图表尚未准备完成');
  const clone = svg.cloneNode(true);
  const viewBox = clone.getAttribute('viewBox')?.split(/\s+/).map(Number) ?? [0, 0, 1120, 280];
  const width = viewBox[2] || 1120;
  const height = viewBox[3] || 280;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    text { font-family: "Segoe UI", "Microsoft YaHei", sans-serif; }
    .chart-grid { stroke: rgba(147,187,219,.14); stroke-width: 1; }
    .chart-axis-label { fill: #8ba3b8; font-size: 9px; }
    .chart-axis-title { fill: #8ba3b8; font-size: 10px; }
    .chart-unit { fill: #607f93; font-size: 9px; }
    .chart-annotation { fill: #f6b73c; font-size: 10px; }
    .chart-annotation.green { fill: #35d49a; }
    .series-line { fill: none; stroke-width: 2; }
    .series-line.baseline { stroke: #f6b73c; opacity: .8; }
    .series-line.optimized { stroke: #22d3ee; stroke-width: 2.3; }
    .hover-line { stroke: rgba(255,255,255,.35); stroke-dasharray: 4 4; }
    .pareto-point { cursor: pointer; }
  `;
  clone.insertBefore(style, clone.firstChild);
  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('SVG 转 PNG 失败'));
      img.src = url;
    });
    const header = title ? 66 : 0;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round((height + header) * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    if (title) {
      ctx.fillStyle = '#e9f3fb';
      ctx.font = '600 20px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.fillText(title, 24, 28);
      if (subtitle) {
        ctx.fillStyle = '#8ba5b8';
        ctx.font = '400 11px "Segoe UI", "Microsoft YaHei", sans-serif';
        ctx.fillText(subtitle, 24, 48);
      }
    }
    ctx.translate(0, header);
    ctx.drawImage(image, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG 生成失败');
    downloadBlob(blob, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function timestampSlug(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
