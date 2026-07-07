import { useState } from 'react';
import { FiShoppingBag, FiBox } from 'react-icons/fi';
import { LOCAL_LABELS, LOCAL_COLORS } from './inventarioData';
import '../../css/InventarioShared.css';

// ─── Badge ────────────────────────────────────────────────────────────────────
const BADGE_MAP = {
  critical: { bg: '#FCEBEB', text: '#791F1F' },
  out:      { bg: '#FCEBEB', text: '#791F1F' },
  low:      { bg: '#FAEEDA', text: '#633806' },
  warning:  { bg: '#FAEEDA', text: '#633806' },
  ok:       { bg: '#EAF3DE', text: '#27500A' },
  soon:     { bg: '#EAF3DE', text: '#27500A' },
  info:     { bg: '#E6F1FB', text: '#0C447C' },
};

export function Badge({ label, level }) {
  const col = BADGE_MAP[level] || BADGE_MAP.ok;
  return (
    <span className="inv-badge" style={{ backgroundColor: col.bg, color: col.text }}>
      {label}
    </span>
  );
}

// ─── LocalChip ────────────────────────────────────────────────────────────────
export function LocalChip({ local }) {
  const col = LOCAL_COLORS[local] || { bg: '#F8F9FA', text: '#7F8C8D' };
  return (
    <span className="inv-chip" style={{ backgroundColor: col.bg, color: col.text }}>
      {LOCAL_LABELS[local] || local}
    </span>
  );
}

// ─── StockBar ─────────────────────────────────────────────────────────────────
export function StockBar({ pct, level, compact = false }) {
  const color = level === 'ok'
    ? '#639922'
    : ['critical', 'out'].includes(level) ? '#E24B4A' : '#BA7517';
  const height = compact ? 3 : 5;

  return (
    <div className={compact ? 'inv-bar-wrap-compact' : 'inv-bar-wrap'}>
      <div className="inv-bar-bg" style={{ height }}>
        <div className="inv-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      {!compact && <span className="inv-bar-pct">{pct}%</span>}
    </div>
  );
}

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────
export function ToggleSwitch({ value, onToggle }) {
  return (
    <button
      type="button"
      className={`inv-switch-track ${value ? 'inv-switch-on' : 'inv-switch-off'}`}
      onClick={onToggle}
      role="switch"
      aria-checked={value}
    >
      <span className="inv-switch-thumb" />
    </button>
  );
}

// ─── ModoToggleDesktop (Ventas / Inventario) ─────────────────────────────────
export function ModoToggleDesktop({ modo, setModo }) {
  return (
    <div className="inv-modo-wrap">
      {['venta', 'inventario'].map(m => (
        <button
          type="button"
          key={m}
          onClick={() => setModo(m)}
          className={`inv-modo-btn ${modo === m ? 'inv-modo-btn-active' : ''}`}
        >
          {m === 'venta' ? <FiShoppingBag size={13} /> : <FiBox size={13} />}
          <span className="inv-modo-label">{m === 'venta' ? 'Ventas' : 'Inventario'}</span>
        </button>
      ))}
    </div>
  );
}
