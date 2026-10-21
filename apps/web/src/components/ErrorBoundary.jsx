import React from 'react';
import { Icon } from './Icons.jsx';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, retrying: false, attempt: 0 };
    this.timer = null;
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[CFC dashboard]', error, info);
    if (this.state.attempt < 1) {
      this.setState({ retrying: true });
      this.timer = window.setTimeout(() => {
        this.setState((previous) => ({
          error: null,
          retrying: false,
          attempt: previous.attempt + 1,
        }));
      }, 1200);
    }
  }

  componentWillUnmount() {
    if (this.timer) window.clearTimeout(this.timer);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-screen">
          <div className="fatal-card">
            <span className="eyebrow">RUNTIME RECOVERY</span>
            <h1>{this.state.retrying ? '界面异常，正在自动重建…' : '界面未能恢复'}</h1>
            <p>错误已被捕获。仿真 Worker 与本地数据不受影响；可重新载入页面或再试一次。</p>
            <details>
              <summary>查看异常信息</summary>
              <pre>{String(this.state.error?.stack ?? this.state.error)}</pre>
            </details>
            <div className="fatal-actions">
              <button type="button" className="btn primary" onClick={() => window.location.reload()}>
                <Icon name="refresh" size={16} /> 重新载入
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => this.setState({ error: null, retrying: false, attempt: 0 })}
              >
                再试一次
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
