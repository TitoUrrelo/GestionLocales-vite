import { FiAlertTriangle, FiArrowDown, FiAlertOctagon, FiClock, FiCalendar, FiPackage } from 'react-icons/fi';
import { Badge } from './InventarioShared';
import { StockBar } from './InventarioShared';
import { DIAS, HOY_IDX } from './inventarioData';
import { getLevel, getPct, getVencLevel } from './inventarioHelpers';
import '../../css/AlertCards.css';

// ─── Stock Alert Card ─────────────────────────────────────────────────────────
export function StockAlertCard({ item, onVerDetalle, compact = false }) {
  const level       = getLevel(item);
  const pct         = getPct(item);
  const isCritical  = ['critical', 'out'].includes(level);
  const accentColor = isCritical ? '#E24B4A' : '#BA7517';
  const badgeLabel  = level === 'out' ? 'Sin stock' : isCritical ? 'Crítico' : 'Stock bajo';
  const badgeLevel  = isCritical ? 'critical' : 'low';

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onVerDetalle(item)}
        className="inv-alert-card-compact"
        style={{ borderLeftColor: accentColor }}
      >
        <span className="inv-alert-icon-sm" style={{ backgroundColor: isCritical ? '#FCEBEB' : '#FAEEDA' }}>
          {isCritical ? <FiAlertTriangle size={11} color="#791F1F" /> : <FiArrowDown size={11} color="#633806" />}
        </span>
        <span className="inv-alert-info-compact">
          <span className="inv-alert-nombre-compact">{item.nombre}</span>
          <span className="inv-alert-meta-compact">{item.qty} {item.unit} · mín {item.min} {item.unit}</span>
          <StockBar pct={pct} level={level} compact />
        </span>
        <Badge label={badgeLabel} level={badgeLevel} />
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onVerDetalle(item)} className="inv-alert-card" style={{ borderLeftColor: accentColor }}>
      <span className="inv-alert-icon" style={{ backgroundColor: isCritical ? '#FCEBEB' : '#FAEEDA' }}>
        {isCritical ? <FiAlertTriangle size={16} color="#791F1F" /> : <FiArrowDown size={16} color="#633806" />}
      </span>
      <span className="inv-alert-info">
        <span className="inv-alert-nombre">{item.nombre}</span>
        <span className="inv-alert-meta">
          Actual: <b>{item.qty} {item.unit}</b>{'  ·  '}Mínimo: {item.min} {item.unit}
        </span>
      </span>
      <span className="inv-alert-side">
        <StockBar pct={pct} level={level} />
        <Badge label={badgeLabel} level={badgeLevel} />
      </span>
    </button>
  );
}

// ─── Vencimiento Card ──────────────────────────────────────────────────────────
export function VencimientoCard({ item, onVerDetalle, compact = false }) {
  const level      = getVencLevel(item.vence);
  const isCritical = level === 'critical';
  const accentColor = isCritical ? '#E24B4A' : level === 'warning' ? '#BA7517' : '#639922';
  const badgeLabel  = isCritical ? '¡Hoy/Mañana!' : `${item.vence} días`;

  const Icon    = isCritical ? FiAlertOctagon : level === 'warning' ? FiClock : FiCalendar;
  const iconColor = isCritical ? '#791F1F' : level === 'warning' ? '#633806' : '#27500A';
  const iconBg    = isCritical ? '#FCEBEB' : level === 'warning' ? '#FAEEDA' : '#EAF3DE';

  if (compact) {
    return (
      <button type="button" onClick={() => onVerDetalle(item)} className="inv-alert-card-compact" style={{ borderLeftColor: accentColor }}>
        <span className="inv-alert-icon-sm" style={{ backgroundColor: iconBg }}>
          <Icon size={11} color={iconColor} />
        </span>
        <span className="inv-alert-info-compact">
          <span className="inv-alert-nombre-compact">{item.nombre}</span>
          <span className="inv-alert-meta-compact">{item.qty} {item.unitQty} · {item.lote}</span>
        </span>
        <Badge label={badgeLabel} level={level} />
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onVerDetalle(item)} className="inv-alert-card" style={{ borderLeftColor: accentColor }}>
      <span className="inv-alert-icon" style={{ backgroundColor: iconBg }}>
        <Icon size={16} color={iconColor} />
      </span>
      <span className="inv-alert-info">
        <span className="inv-alert-nombre">{item.nombre}</span>
        <span className="inv-alert-meta">
          Cantidad: <b>{item.qty} {item.unitQty}</b>{'  ·  '}Lote: {item.lote}
        </span>
      </span>
      <span className="inv-alert-side">
        <Badge label={badgeLabel} level={level} />
        <span className="inv-bar-pct">Vence en</span>
      </span>
    </button>
  );
}

// ─── Proveedor Card ────────────────────────────────────────────────────────────
export function ProveedorCard({ proveedor, onVerDetalle, compact = false }) {
  const visitaHoy = proveedor.dias.includes(HOY_IDX);

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onVerDetalle(proveedor)}
        className="inv-prov-card-compact"
        style={visitaHoy ? { borderLeftColor: '#BA7517', borderLeftWidth: 2.5 } : undefined}
      >
        <span className="inv-avatar-sm">{proveedor.initials}</span>
        <span className="inv-alert-info-compact">
          <span className="inv-alert-nombre-compact">{proveedor.nombre}</span>
          <span className="inv-alert-meta-compact">{proveedor.empresa}</span>
        </span>
        {visitaHoy
          ? <Badge label="Hoy" level="low" />
          : <span className="inv-alert-meta-compact">{DIAS[proveedor.dias.find(d => d !== HOY_IDX) ?? proveedor.dias[0]]}</span>
        }
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onVerDetalle(proveedor)}
      className="inv-prov-card"
      style={visitaHoy ? { borderLeftColor: '#BA7517', borderLeftWidth: 3 } : undefined}
    >
      <span className="inv-avatar">{proveedor.initials}</span>
      <span className="inv-prov-body">
        <span className="inv-prov-row">
          <span className="inv-prov-nombre">{proveedor.nombre}</span>
          {visitaHoy && <Badge label="Hoy" level="low" />}
        </span>
        <span className="inv-prov-tipo">{proveedor.empresa}</span>
        <span className="inv-prov-dias">
          {proveedor.dias.map(d => (
            <span key={d} className={`inv-dia-chip ${d === HOY_IDX ? 'inv-dia-chip-hoy' : ''}`}>
              {DIAS[d]}{d === HOY_IDX ? ' · Hoy' : ''}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

// ─── Calendario semanal ────────────────────────────────────────────────────────
const DIAS_SEMANA_CAL = [
  { idx: 1, label: 'Lun' }, { idx: 2, label: 'Mar' }, { idx: 3, label: 'Mié' },
  { idx: 4, label: 'Jue' }, { idx: 5, label: 'Vie' }, { idx: 6, label: 'Sáb' }, { idx: 0, label: 'Dom' },
];

export function CalendarioSemanal({ proveedores, onDiaPress, compact = false }) {
  return (
    <div className="inv-cal-grid">
      {DIAS_SEMANA_CAL.map(({ idx, label }) => {
        const esHoy   = idx === HOY_IDX;
        const provDia = proveedores.filter(p => p.dias.includes(idx));
        return (
          <button
            type="button"
            key={idx}
            onClick={() => esHoy && onDiaPress && onDiaPress(provDia)}
            className={`inv-cal-col ${esHoy ? 'inv-cal-col-hoy' : ''}`}
            disabled={!esHoy}
          >
            <div className={`inv-cal-header ${esHoy ? 'inv-cal-header-hoy' : ''}`}>
              {esHoy ? 'HOY' : label}
            </div>
            <div className="inv-cal-body" style={{ padding: compact ? 3 : 4 }}>
              {provDia.length === 0
                ? <div style={{ height: compact ? 16 : 20 }} />
                : provDia.map(p => (
                    <div key={p.id} className={`inv-cal-chip ${esHoy ? 'inv-cal-chip-hoy' : ''}`}>
                      {p.initials}
                    </div>
                  ))
              }
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Producto reciente card ───────────────────────────────────────────────────
export function ProductoRecienteCard({ item }) {
  return (
    <div className="inv-prc-card">
      <span className="inv-prc-icon"><FiPackage size={14} /></span>
      <span className="inv-prc-body">
        <span className="inv-prc-nombre">{item.nombre}</span>
        <span className="inv-prc-meta">{item.cantidad} {item.unit} · {item.hora}</span>
        <span className="inv-prc-fecha">{item.fecha}</span>
      </span>
    </div>
  );
}
