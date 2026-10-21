import React, { useEffect, useRef, useState } from 'react';
import {
  BUILDING,
  GLAZING_TYPES,
  SHADING_STRATEGIES,
  orientationLabel,
} from '@cfc/energy-core';
import { CFCScene } from '../scene/cfcScene.js';
import { Icon } from './Icons.jsx';
import { formatNumber, formatPercent } from '../lib/format.js';
import { ComponentInspector } from './ComponentInspector.jsx';

export function BuildingViewer({
  result,
  selectedFloor,
  onFloorChange,
  selectedComponent,
  onSelectComponent,
  onCloseComponent,
  loading,
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!result || !containerRef.current) return undefined;
    const scene = new CFCScene(containerRef.current, {
      onSelect: (selection) => onSelectComponent(selection),
    });
    scene.build(result);
    scene.setFloor(selectedFloor);
    sceneRef.current = scene;
    setReady(true);
    return () => {
      scene.dispose();
      sceneRef.current = null;
      setReady(false);
    };
  }, [result, onSelectComponent]);

  useEffect(() => {
    sceneRef.current?.setFloor(selectedFloor);
  }, [selectedFloor]);

  const floorButtons = [null, 0, 1, 2, 3, 4, 5];

  return (
    <section className="viewer-card">
      <div className="viewer-canvas" ref={containerRef}>
        {(!result || loading) && (
          <div className="viewer-loading">
            <div className="loader-orb" />
            <strong>正在构建 CFC 数字孪生</strong>
            <span>解析 8,760 小时气象并生成六层围护模型…</span>
          </div>
        )}
        {result && (
          <div className="viewer-head">
            <div>
              <div className="eyebrow light">
                <Icon name="layers" size={13} />
                DIGITAL TWIN · LIVE GEOMETRY
              </div>
              <h3>CFC Cairo · {BUILDING.floors.length}F</h3>
              <p>点击外墙、窗、遮阳、光伏板或 Openlab 查看热工参数</p>
            </div>
            <div className="viewer-mode">
              <button
                type="button"
                className={selectedFloor === null ? 'active' : ''}
                onClick={() => onFloorChange(null)}
              >
                全楼
              </button>
              <span className="mode-divider" />
              {BUILDING.floors.map((floor) => (
                <button
                  type="button"
                  key={floor.level}
                  className={selectedFloor === floor.level ? 'active' : ''}
                  onClick={() => onFloorChange(selectedFloor === floor.level ? null : floor.level)}
                >
                  {floor.short}
                </button>
              ))}
            </div>
          </div>
        )}
        {result && (
          <>
            <div className="viewer-hint">
              <Icon name="mouse" size={14} />
              拖拽旋转 · 滚轮缩放 · 点击构件
            </div>
            <div className="viewer-floor-label">
              {selectedFloor === null ? (
                <span>全楼视图 · 点击楼层剖切</span>
              ) : (
                <>
                  <span>{`${selectedFloor}F · ${BUILDING.floors[selectedFloor].name}`}</span>
                  <small>外墙已隐去以显示房间分区</small>
                </>
              )}
            </div>
            <div className="compass">
              <span>N</span>
              <i />
              <span>E</span>
              <span>S</span>
              <span>W</span>
            </div>
            {selectedComponent && (
              <ComponentInspector
                selection={selectedComponent}
                result={result}
                onClose={onCloseComponent}
              />
            )}
          </>
        )}
      </div>
      <div className="viewer-strip">
        <span>
          <i className="status-dot" />
          {ready ? 'WebGL 就绪' : '初始化中'}
        </span>
        <span>
          <Icon name="building" size={12} />
          {formatNumber(BUILDING.totalArea, 0)} m² · {BUILDING.floors.length} 层
        </span>
        <span>
          <Icon name="sun" size={12} />
          {result ? `${formatNumber(result.weatherMeta?.annual?.tdbMax ?? 42.4, 1)} °C 极端高温` : '开罗 TMYx'}
        </span>
        <span className="viewer-design">
          {result && `${result.design.wallInsulationMm} mm 保温 · ${formatPercent(result.design.wwr, 0)} WWR · ${GLAZING_TYPES[result.design.glazing].short} · ${SHADING_STRATEGIES[result.design.shading].short}遮阳`}
        </span>
      </div>
    </section>
  );
}
