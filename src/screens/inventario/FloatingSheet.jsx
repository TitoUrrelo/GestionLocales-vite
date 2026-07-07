import { useState, useEffect } from 'react';
import { FiX, FiInfo, FiDownload, FiTruck } from 'react-icons/fi';
import '../../css/FloatingSheet.css';

// ─── Overlay borroso (fondo oscuro que cierra al hacer click) ────────────────
export function BlurOverlay({ onPress, children }) {
  return (
    <div className="inv-blur-overlay" onClick={onPress}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ─── Hook simple para saber si estamos en mobile ─────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

// ─── Pantalla flotante genérica centrada ─────────────────────────────────────
export function FloatingSheet({ visible, onClose, title, children }) {
  const isMobile = useIsMobile();
  if (!visible) return null;

  return (
    <BlurOverlay onPress={onClose}>
      <div
        className="inv-fl-sheet"
        style={{ width: isMobile ? '96vw' : 'min(75vw, 900px)', maxHeight: isMobile ? '90vh' : '85vh' }}
      >
        <div className="inv-fl-header">
          <h2 className="inv-fl-title">{title}</h2>
          <button type="button" className="inv-fl-close" onClick={onClose} aria-label="Cerrar">
            <FiX size={20} />
          </button>
        </div>
        <div className="inv-fl-body">
          {children}
        </div>
      </div>
    </BlurOverlay>
  );
}

// ─── Pantalla flotante de reporte de inventario ──────────────────────────────
export function FloatingReporte({ visible, onClose, activeLocal, localLabels }) {
  const [periodo, setPeriodo] = useState('diario');
  if (!visible) return null;

  return (
    <FloatingSheet visible={visible} onClose={onClose} title="Generar reporte de inventario">
      <p className="inv-fl-muted-label">Local: {localLabels?.[activeLocal]}</p>

      <p className="inv-fl-section-label">PERIODO</p>
      <div className="inv-rep-pills">
        {['diario', 'semanal', 'mensual'].map(p => (
          <button
            type="button"
            key={p}
            onClick={() => setPeriodo(p)}
            className={`inv-rep-pill ${periodo === p ? 'inv-rep-pill-active' : ''}`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="inv-rep-infobox">
        <FiInfo size={14} />
        <span>
          {periodo === 'diario'  && 'Reporte de movimientos del día de hoy.'}
          {periodo === 'semanal' && 'Reporte de los últimos 7 días de inventario.'}
          {periodo === 'mensual' && 'Reporte del mes actual con resumen de ingresos.'}
        </span>
      </div>

      <button type="button" className="inv-rep-genbtn" onClick={onClose}>
        <FiDownload size={15} />
        Generar reporte {periodo}
      </button>
    </FloatingSheet>
  );
}

// ─── Floating KPI: lista de items con toggle activo/inactivo ─────────────────
export function FloatingKPIList({ visible, onClose, title, items, renderItem }) {
  if (!visible) return null;
  return (
    <FloatingSheet visible={visible} onClose={onClose} title={title}>
      {items.length === 0
        ? <p className="inv-fl-empty">Sin elementos</p>
        : items.map(item => renderItem(item))
      }
    </FloatingSheet>
  );
}

// ─── Floating: visitan hoy (recordatorio de entrada) ─────────────────────────
export function FloatingVisitanHoy({ visible, onClose, onNoMostrarHoy, provHoy }) {
  const isMobile = useIsMobile();
  if (!visible || provHoy.length === 0) return null;

  return (
    <BlurOverlay onPress={() => {}}>
      <div
        className="inv-vhf-sheet"
        style={{ width: isMobile ? 'calc(100vw - 20px)' : 'min(65vw, 700px)', maxHeight: isMobile ? '90vh' : '80vh' }}
      >
        <div className="inv-vhf-header" style={{ padding: isMobile ? 14 : 16 }}>
          <FiTruck size={18} />
          <h2 className="inv-vhf-title">Proveedores de hoy</h2>
        </div>

        <div className="inv-vhf-list" style={{ maxHeight: isMobile ? '55vh' : 240, padding: isMobile ? 12 : 14 }}>
          {provHoy.map((p) => (
            <div key={p.id} className="inv-vhf-row">
              <div className="inv-vhf-avatar">{p.initials}</div>
              <div className="inv-vhf-info">
                <p className="inv-vhf-nombre">{p.nombre}</p>
                <p className="inv-vhf-empresa">{p.empresa}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="inv-vhf-footer" style={{ flexDirection: isMobile ? 'column' : 'row' }}>
          <button type="button" className="inv-vhf-btn inv-vhf-btn-secondary" onClick={onNoMostrarHoy}>
            No mostrar en esta sesión
          </button>
          <button type="button" className="inv-vhf-btn inv-vhf-btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </BlurOverlay>
  );
}
