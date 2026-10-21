import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_DESIGN, BUILDING } from '@cfc/energy-core';
import { TopBar } from './components/TopBar.jsx';
import { LoadingScreen } from './components/LoadingScreen.jsx';
import { Toast } from './components/Toast.jsx';
import { OverviewPage } from './components/OverviewPage.jsx';
import { EnvelopePage } from './components/EnvelopePage.jsx';
import { PvPage } from './components/PvPage.jsx';
import { OpenlabPage } from './components/OpenlabPage.jsx';
import { ReportsPage } from './components/ReportsPage.jsx';

function computeSavings(baseline, current) {
  const change = (base, value) => (base > 0 ? ((base - value) / base) * 100 : 0);
  return {
    coolingPct: change(baseline.summary.annualCoolingMWh, current.summary.annualCoolingMWh),
    heatingPct: change(baseline.summary.annualHeatingMWh, current.summary.annualHeatingMWh),
    electricityPct: change(baseline.summary.annualBuildingElectricityMWh, current.summary.annualBuildingElectricityMWh),
    peakPct: change(baseline.summary.peakCoolingKW, current.summary.peakCoolingKW),
    hvacPct: change(baseline.summary.annualHvacElectricityMWh, current.summary.annualHvacElectricityMWh),
    selfConsumptionDeltaPp:
      (current.summary.pvSelfConsumptionRatio - baseline.summary.pvSelfConsumptionRatio) * 100,
    selfSufficiencyDeltaPp:
      (current.summary.pvSelfSufficiencyRatio - baseline.summary.pvSelfSufficiencyRatio) * 100,
    co2DeltaTonnes: current.summary.co2AvoidedTonnes - baseline.summary.co2AvoidedTonnes,
  };
}

export default function App() {
  const workerRef = useRef(null);
  const [page, setPage] = useState('overview');
  const [baseline, setBaseline] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [customResult, setCustomResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ phase: 'init', completed: 0, total: 1, message: '初始化仿真…' });
  const [optimizing, setOptimizing] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [design, setDesign] = useState({ ...DEFAULT_DESIGN });
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((title, message = '', tone = 'ok') => {
    setToast({ id: Date.now(), title, message, tone });
  }, []);

  const startWorker = useCallback(() => {
    workerRef.current?.terminate();
    setLoading(true);
    setError(null);
    setCustomResult(null);
    const worker = new Worker(new URL('./workers/simulation.worker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'progress') {
        setProgress(data);
      } else if (data.type === 'baseline') {
        setBaseline(data.baseline);
        setProgress((previous) => ({ ...previous, message: '基准方案完成，开始围护优化…' }));
      } else if (data.type === 'done') {
        setBaseline(data.optimization.baseline);
        setOptimization(data.optimization);
        setDesign({ ...data.optimization.recommended.design });
        setLoading(false);
        setOptimizing(false);
        setEvaluating(false);
        setProgress({ phase: 'done', completed: 1, total: 1, message: '优化完成' });
        setCustomResult(null);
        notify(
          'Agent 优化完成',
          `制冷 ${data.optimization.baseline.summary.annualCoolingMWh.toFixed(1)} → ${data.optimization.recommended.summary.annualCoolingMWh.toFixed(1)} MWh · 节能 ${data.optimization.savings.coolingPct.toFixed(1)}%`,
          'ok',
        );
      } else if (data.type === 'evaluated') {
        setCustomResult(data.result);
        setDesign(data.design);
        setEvaluating(false);
        notify('方案复算完成', `制冷 ${data.result.summary.annualCoolingMWh.toFixed(1)} MWh · ${data.result.summary.comfortCompliance >= 0.98 ? '舒适性满足' : '注意舒适性'}`, 'ok');
      } else if (data.type === 'error') {
        setError(data.message);
        setLoading(false);
        setOptimizing(false);
        setEvaluating(false);
      }
    };
    worker.onerror = (event) => {
      setError(event.message || '仿真 Worker 发生异常');
      setLoading(false);
      setOptimizing(false);
      setEvaluating(false);
    };
    worker.postMessage({ type: 'run' });
  }, [notify]);

  useEffect(() => {
    startWorker();
    return () => workerRef.current?.terminate();
  }, [startWorker]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  useEffect(() => {
    if (error && optimization) {
      notify('优化未完成', error, 'error');
    }
  }, [error, notify, optimization]);

  const runOptimization = useCallback(() => {
    if (!workerRef.current || optimizing) return;
    setOptimizing(true);
    setProgress({ phase: 'baseline', completed: 0, total: 1, message: '重新计算基准与围护组合…' });
    workerRef.current.postMessage({ type: 'run' });
  }, [optimizing]);

  const evaluateDesign = useCallback(
    (nextDesign) => {
      if (!workerRef.current || evaluating) return;
      setDesign(nextDesign);
      setEvaluating(true);
      setSelectedFloor(null);
      workerRef.current.postMessage({ type: 'evaluate', design: nextDesign });
    },
    [evaluating],
  );

  const current = customResult ?? optimization?.recommended ?? null;
  const viewOptimization = useMemo(() => {
    if (!optimization || !current) return optimization;
    if (!customResult) return optimization;
    return {
      ...optimization,
      recommended: customResult,
      savings: computeSavings(optimization.baseline, customResult),
    };
  }, [current, customResult, optimization]);

  const metadata = baseline?.weatherMeta ?? optimization?.baseline?.weatherMeta ?? {
    annual: { tdbMax: 42.4, tdbMean: 22.13, ghiTotalKwhM2: 2148.5 },
    dataset: 'EGY_QH_Cairo.Intl.AP.623660_TMYx',
  };

  if (loading || !optimization || !viewOptimization) {
    return (
      <div className="app-shell">
        <LoadingScreen progress={progress} error={error} onRetry={startWorker} />
      </div>
    );
  }

  const savings = viewOptimization.savings;
  const pageProps = {
    optimization,
    viewOptimization,
    current,
    savings,
    metadata,
    selectedFloor,
    onFloorChange: setSelectedFloor,
    selectedComponent,
    onSelectComponent: setSelectedComponent,
    onCloseComponent: () => setSelectedComponent(null),
    onOpenEnvelope: () => setPage('envelope'),
    onNavigate: setPage,
  };

  return (
    <div className="app-shell">
      <TopBar
        page={page}
        onNavigate={setPage}
        metadata={metadata}
        optimization={optimization}
        optimizing={optimizing}
        progress={progress}
        onOptimize={runOptimization}
        onExport={() => setPage('reports')}
      />
      {page === 'overview' && <OverviewPage {...pageProps} />}
      {page === 'envelope' && (
        <EnvelopePage
          optimization={optimization}
          result={current}
          design={design}
          onDesignChange={setDesign}
          onApply={() => evaluateDesign(design)}
          evaluating={evaluating}
          onOptimize={runOptimization}
          optimizing={optimizing}
          progress={progress}
          onPickCandidate={(point) => evaluateDesign(point.design)}
        />
      )}
      {page === 'pv' && <PvPage optimization={viewOptimization} />}
      {page === 'openlab' && (
        <OpenlabPage
          optimization={viewOptimization}
          onShowIn3D={() => {
            setPage('overview');
            setSelectedFloor(1);
            setSelectedComponent({ kind: 'openlab', floor: 1 });
          }}
        />
      )}
      {page === 'reports' && <ReportsPage optimization={optimization} onToast={notify} />}
      <footer className="app-footer">
        <span>CFC Cairo Energy Twin · 8,760 h annual simulation</span>
        <span><i className="status-dot ok" /> 3R2C thermal core · {optimization.search.evaluated} envelope candidates</span>
        <span>{BUILDING.fullName}</span>
      </footer>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
