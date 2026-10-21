import React, { useRef, useState } from 'react';
import { buildMarkdownReport } from '@cfc/reporting/markdown';
import {
  comparisonCsv,
  floorCsv,
  hourlyCsv,
  monthlyCsv,
  openlabComponentsCsv,
  openlabCsv,
} from '@cfc/reporting/csv';
import { Icon } from './Icons.jsx';
import { HourlyChart } from '../charts/HourlyChart.jsx';
import { MonthlyChart } from '../charts/MonthlyChart.jsx';
import { formatNumber, formatPercent } from '../lib/format.js';
import { timestampSlug, downloadText, exportSvgAsPng } from '../lib/export.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function ReportsPage({ optimization, onToast }) {
  const hourlyRef = useRef(null);
  const monthlyRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const { baseline, recommended, savings, agent, search } = optimization;
  const metadata = baseline.weatherMeta ?? {};
  const stamp = timestampSlug();

  const report = buildMarkdownReport({
    baseline,
    optimized: recommended,
    savings,
    agent,
    metadata,
    search,
    generatedAt: new Date(),
  });

  const downloadCsv = () => {
    downloadText(`cfc-hourly-${stamp}.csv`, hourlyCsv(recommended), 'text/csv;charset=utf-8');
    downloadText(`cfc-monthly-${stamp}.csv`, monthlyCsv(recommended), 'text/csv;charset=utf-8');
    downloadText(`cfc-openlab-${stamp}.csv`, openlabCsv(recommended), 'text/csv;charset=utf-8');
    downloadText(`cfc-openlab-components-${stamp}.csv`, openlabComponentsCsv(recommended), 'text/csv;charset=utf-8');
    downloadText(`cfc-floors-${stamp}.csv`, floorCsv(recommended), 'text/csv;charset=utf-8');
    downloadText(
      `cfc-scenarios-${stamp}.csv`,
      comparisonCsv({ baseline, optimized: recommended, savings }),
      'text/csv;charset=utf-8',
    );
    onToast?.('CSV 已导出', '逐时、逐月、分层、Openlab 与方案对比共 6 个文件');
  };

  const downloadMarkdown = () => {
    downloadText(`CFC-Cairo-analysis-${stamp}.md`, report, 'text/markdown;charset=utf-8');
    onToast?.('Markdown 分析报告已导出', '包含基准/优化对比、逐月表、机房与校验');
  };

  const downloadPng = async () => {
    await exportSvgAsPng(hourlyRef.current, `cfc-annual-hourly-${stamp}.png`, {
      title: 'CFC Cairo — Annual Hourly Cooling Load',
      subtitle: 'Baseline vs optimized envelope · 8,760 hours · TMYx Cairo',
    });
    await wait(250);
    await exportSvgAsPng(monthlyRef.current, `cfc-monthly-${stamp}.png`, {
      title: 'CFC Cairo — Monthly Cooling Demand',
      subtitle: 'Baseline vs optimized envelope · thermal cooling demand',
    });
    onToast?.('PNG 曲线图已导出', '全年逐时冷负荷 + 逐月对比');
  };

  const downloadAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      downloadCsv();
      await wait(350);
      downloadMarkdown();
      await wait(350);
      await downloadPng();
      downloadText(`cfc-agent-notes-${stamp}.md`, `# Agent 优化说明\n\n${agent.headline}\n\n${agent.bullets.map((b) => `- ${b}`).join('\n')}\n`, 'text/markdown;charset=utf-8');
      onToast?.('报告包导出完成', 'CSV · PNG · Markdown · Agent 说明');
    } catch (error) {
      onToast?.('导出失败', error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page reports-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow"><Icon name="file" size={13} /> REPORT EXPORT</span>
          <h1>标准化报表与数据交付</h1>
          <p>自动输出 CSV 原始数据、PNG 曲线图与 Markdown 仿真分析报告，并对比基准与优化方案的节能率。</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="btn primary" onClick={downloadAll} disabled={busy}>
            <Icon name="download" size={16} />
            {busy ? '正在生成…' : '一键导出报告包'}
          </button>
        </div>
      </header>

      <div className="report-actions">
        <button type="button" className="report-action" onClick={downloadCsv}>
          <span className="report-icon"><Icon name="chart" size={20} /></span>
          <div><strong>CSV 原始数据</strong><small>8,760 小时 · 6 个明细表</small></div>
          <Icon name="download" size={16} />
        </button>
        <button type="button" className="report-action" onClick={downloadMarkdown}>
          <span className="report-icon"><Icon name="file" size={20} /></span>
          <div><strong>Markdown 分析报告</strong><small>12 章 · 含节能率与校验</small></div>
          <Icon name="download" size={16} />
        </button>
        <button type="button" className="report-action" onClick={downloadPng}>
          <span className="report-icon"><Icon name="activity" size={20} /></span>
          <div><strong>PNG 曲线图</strong><small>逐时冷负荷 + 逐月对比</small></div>
          <Icon name="download" size={16} />
        </button>
        <button type="button" className="report-action" onClick={() => onToast?.('报告预览', '下方展示摘要与校验；完整内容请导出 Markdown')}>
          <span className="report-icon"><Icon name="eye" size={20} /></span>
          <div><strong>报告预览</strong><small>摘要 · 校验 · 优化结论</small></div>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>

      <div className="report-summary-card">
        <div className="report-summary-head">
          <div>
            <span className="eyebrow">EXECUTIVE SUMMARY</span>
            <h2>{agent.headline}</h2>
          </div>
          <span className="tag green">Agent generated</span>
        </div>
        <div className="report-metrics">
          <div><span>制冷节能率</span><strong>{formatNumber(savings.coolingPct, 1)}%</strong></div>
          <div><span>峰值削减</span><strong>{formatNumber(savings.peakPct, 1)}%</strong></div>
          <div><span>建筑用电节省</span><strong>{formatNumber(savings.electricityPct, 1)}%</strong></div>
          <div><span>光伏自给率</span><strong>{formatPercent(recommended.summary.pvSelfSufficiencyRatio, 1)}</strong></div>
          <div><span>舒适满足率</span><strong>{formatPercent(recommended.summary.comfortCompliance, 1)}</strong></div>
          <div><span>能量平衡偏差</span><strong>{formatNumber(recommended.validation.energyBalanceErrorPct, 4)}%</strong></div>
        </div>
        <div className="report-body">
          {agent.bullets.map((bullet) => (
            <p key={bullet}><Icon name="check" size={13} />{bullet}</p>
          ))}
        </div>
      </div>

      <div className="report-charts">
        <HourlyChart baseline={baseline} optimized={recommended} svgRef={hourlyRef} height={250} compact />
        <MonthlyChart baseline={baseline} optimized={recommended} svgRef={monthlyRef} height={250} compact />
      </div>

      <div className="report-bottom">
        <section className="side-card report-checklist">
          <div className="side-card-head">
            <div><span className="eyebrow">DELIVERABLES</span><h3>交付清单</h3></div>
          </div>
          <div className="checklist">
            {[
              ['逐时冷热负荷 CSV', '8,760 行，含气象、负荷、光伏与电网交换'],
              ['逐月统计 CSV', '12 个月，基准与优化'],
              ['Openlab 分项 CSV', '逐月与得热构成'],
              ['分层负荷 CSV', '0F–5F 冷热与峰值'],
              ['方案对比 CSV', '节能率与光伏指标'],
              ['PNG 曲线图', '全年逐时 + 逐月对比'],
              ['Markdown 报告', '方法、结果、校验、建议'],
            ].map(([title, detail]) => (
              <div key={title}><Icon name="check" size={14} /><span><b>{title}</b><small>{detail}</small></span></div>
            ))}
          </div>
        </section>
        <section className="side-card model-notes">
          <div className="side-card-head">
            <div><span className="eyebrow">MODEL NOTES</span><h3>模型边界</h3></div>
          </div>
          <ul>
            <li>3R2C 集总围护模型 + 逐时太阳/内热/新风模型。</li>
            <li>理想 HVAC 设定点控制，未模拟 VAV 末端分钟级响应。</li>
            <li>Openlab 围护得热按 1F 面积分摊，IT/UPS 独立计量。</li>
            <li>光伏未考虑屋顶设备局部阴影与女儿墙遮挡。</li>
          </ul>
          <div className="report-source">
            <span>气象源</span>
            <a href={metadata.sourceUrl} target="_blank" rel="noreferrer">Climate.OneBuilding · Cairo TMYx</a>
            <small>{metadata.dataset}</small>
          </div>
        </section>
      </div>
    </div>
  );
}
