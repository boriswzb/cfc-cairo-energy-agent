import React, { useEffect } from 'react';
import { Icon } from './Icons.jsx';

export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onDismiss, 3600);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.tone ?? 'ok'}`} role="status">
      <span className="toast-icon"><Icon name={toast.tone === 'error' ? 'alert' : 'check'} size={16} /></span>
      <div><strong>{toast.title}</strong>{toast.message && <span>{toast.message}</span>}</div>
      <button type="button" onClick={onDismiss} aria-label="关闭"><Icon name="close" size={14} /></button>
    </div>
  );
}
