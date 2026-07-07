import { useState } from 'react';
import { FiChevronDown, FiCheckCircle, FiInbox, FiPackage, FiBookOpen } from 'react-icons/fi';

import {
  STOCK_DATA, VENCIMIENTOS_DATA,
  LOCAL_LABELS,
  HOY_IDX, TODAY_KEY,
} from './inventarioData';
import { getLevel, getVencLevel, nextVisitOffset } from './inventarioHelpers';

import { Badge } from './InventarioShared';
import { StockAlertCard, VencimientoCard, ProductoRecienteCard, CalendarioSemanal } from './AlertCards';
import { FloatingKPIList, FloatingSheet, FloatingReporte, FloatingVisitanHoy } from './FloatingSheet';
import {
  ModalDetalleStock, ModalDetalleVencimiento,
  ModalDetalleProveedor, ModalNuevoProveedor,
} from './DetalleModals';

import '../../css/DesktopInventarioView.css';

// ─────────────────────────────────────────────────────────────────────────────
// VISTA DESKTOP · MODO INVENTARIO
// ─────────────────────────────────────────────────────────────────────────────
export default function DesktopInventarioView({
  activeLocal,
  proveedores,
  recetasData,
  productosData,
  inventarioReciente,
  modalStock,     setModalStock,
  modalVenc,      setModalVenc,
  modalProv,      setModalProv,
  modalNuevoProv, setModalNuevoProv,
  handleGuardarProveedor,
  setRecetasData,
  setProductosData,
  visitanHoyVisible,        setVisitanHoyVisible,
  visitanHoyDismissedToday, setVisitanHoyDismissedToday,
}) {
  const [kpiMetricas,    setKpiMetricas]    = useState(false);
  const [kpiRecetas,     setKpiRecetas]     = useState(false);
  const [kpiProveedores, setKpiProveedores] = useState(false);
  const [agendaHoyModal, setAgendaHoyModal] = useState(false);
  const [reporteModal,   setReporteModal]   = useState(false);

  // ── Derivados ──
  const stockLocal     = STOCK_DATA.filter(i => i.local === activeLocal);
  const vencLocal      = VENCIMIENTOS_DATA.filter(i => i.local === activeLocal);
  const recetasLocal   = recetasData.filter(r => r.local === activeLocal);
  const productosLocal = productosData.filter(p => p.local === activeLocal);
  const criticos       = stockLocal.filter(i => ['critical', 'out'].includes(getLevel(i)));
  const bajos          = stockLocal.filter(i => getLevel(i) === 'low');
  const porVencer      = vencLocal.filter(i => getVencLevel(i.vence) !== 'soon');
  const totalRecetas   = recetasLocal.length;
  const activas        = recetasLocal.filter(r => r.activa).length;
  const inactivas      = totalRecetas - activas;
  const provLocal      = proveedores.filter(p => p.locales.includes(activeLocal));
  const provHoy        = provLocal.filter(p => p.dias.includes(HOY_IDX));
  const provProximos   = [...provLocal].sort((a, b) => nextVisitOffset(a.dias) - nextVisitOffset(b.dias));
  const totalProvLocal = provLocal.length;
  const recetasInactivas   = recetasLocal.filter(r => !r.activa);
  const productosInactivos = productosLocal.filter(p => !p.activo);
  const recienteLocal  = inventarioReciente.filter(i => i.local === activeLocal && i.fecha === TODAY_KEY);

  return (
    <>
      <div className="div-scroll">

        {/* ── Fila KPIs + agenda ── */}
        <div className="div-kpi-row">

          {/* KPI Métricas */}
          <button type="button" onClick={() => setKpiMetricas(true)} className="div-kpi-card">
            <span className="div-section-label">MÉTRICAS</span>
            <div className="div-metric-grid">
              {[
                { label: 'Productos',  value: stockLocal.length,              color: 'var(--c-textPrimary)' },
                { label: 'Stock bajo', value: criticos.length + bajos.length, color: criticos.length > 0 ? '#E24B4A' : '#BA7517' },
                { label: 'Por vencer', value: porVencer.length,               color: porVencer.length > 0 ? '#BA7517' : 'var(--c-textPrimary)' },
              ].map((m, i) => (
                <div key={i} className="div-metric-card">
                  <span className="div-metric-label">{m.label}</span>
                  <span className="div-metric-value" style={{ color: m.color }}>{m.value}</span>
                </div>
              ))}
            </div>
            <div className="div-kpi-tap">
              <FiChevronDown size={12} />
              <span>Ver inactivos</span>
            </div>
          </button>

          {/* KPI Recetas */}
          <button type="button" onClick={() => setKpiRecetas(true)} className="div-kpi-card">
            <span className="div-section-label">RECETAS</span>
            <div className="div-metric-grid">
              {[
                { label: 'Total',     value: totalRecetas, color: 'var(--c-textPrimary)' },
                { label: 'Activas',   value: activas,      color: '#639922' },
                { label: 'Inactivas', value: inactivas,    color: '#7F8C8D' },
              ].map((m, i) => (
                <div key={i} className="div-metric-card">
                  <span className="div-metric-label">{m.label}</span>
                  <span className="div-metric-value" style={{ color: m.color }}>{m.value}</span>
                </div>
              ))}
            </div>
            <div className="div-kpi-tap">
              <FiChevronDown size={12} />
              <span>Ver inactivas</span>
            </div>
          </button>

          {/* KPI Proveedores */}
          <button type="button" onClick={() => setKpiProveedores(true)} className="div-kpi-card">
            <span className="div-section-label">PROVEEDORES</span>
            <div className="div-metric-grid">
              {[
                { label: 'Total',       value: totalProvLocal, color: 'var(--c-textPrimary)' },
                { label: 'Visitan hoy', value: provHoy.length, color: provHoy.length > 0 ? '#BA7517' : 'var(--c-textPrimary)' },
              ].map((m, i) => (
                <div key={i} className="div-metric-card">
                  <span className="div-metric-label">{m.label}</span>
                  <span className="div-metric-value" style={{ color: m.color }}>{m.value}</span>
                </div>
              ))}
            </div>
            <div className="div-kpi-tap">
              <FiChevronDown size={12} />
              <span>Ver próximas visitas</span>
            </div>
          </button>

          {/* Agenda semanal (no es botón: el click vive en cada día del calendario) */}
          <div className="div-kpi-card div-kpi-agenda">
            <span className="div-section-label" style={{ marginBottom: 8, display: 'block' }}>AGENDA SEMANAL</span>
            <CalendarioSemanal
              proveedores={provLocal}
              compact
              onDiaPress={() => setAgendaHoyModal(true)}
            />
            <div className="div-kpi-agenda-hint">
              Presiona en el día de hoy para mas información
            </div>
          </div>

        </div>

        {/* ── 3 columnas inferiores ── */}
        <div className="div-content-area">

          {/* Col 1: Stock crítico */}
          <div className="div-col3">
            <div className="div-card">
              <div className="div-card-header">
                <span className="div-section-label">STOCK CRÍTICO</span>
                <Badge label={`${criticos.length + bajos.length} productos`} level={criticos.length > 0 ? 'critical' : 'low'} />
              </div>
              {criticos.length === 0 && bajos.length === 0 ? (
                <div className="div-empty-card">
                  <FiCheckCircle size={18} color="#639922" />
                  <span>Sin alertas en {LOCAL_LABELS[activeLocal]}</span>
                </div>
              ) : (
                <div className="div-list-gap">
                  {[...criticos, ...bajos].map(item => (
                    <StockAlertCard key={item.id} item={item} onVerDetalle={setModalStock} compact />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Col 2: Por vencer */}
          <div className="div-col3">
            <div className="div-card">
              <div className="div-card-header">
                <span className="div-section-label">POR VENCER</span>
                <Badge label={`${vencLocal.length} productos`} level={porVencer.length > 0 ? 'warning' : 'ok'} />
              </div>
              {vencLocal.length === 0 ? (
                <div className="div-empty-card">
                  <FiCheckCircle size={18} color="#639922" />
                  <span>Sin vencimientos próximos</span>
                </div>
              ) : (
                <div className="div-list-gap">
                  {[...vencLocal].sort((a, b) => a.vence - b.vence).map(item => (
                    <VencimientoCard key={item.id} item={item} onVerDetalle={setModalVenc} compact />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Col 3: Productos recientes */}
          <div className="div-col3">
            <div className="div-card">
              <div className="div-card-header">
                <span className="div-section-label">INGRESADOS HOY</span>
                <Badge label={`${recienteLocal.length}`} level="info" />
              </div>
              {recienteLocal.length === 0 ? (
                <div className="div-empty-card">
                  <FiInbox size={18} color="var(--c-placeholder, #B0ADA8)" />
                  <span>Sin ingresos hoy</span>
                </div>
              ) : (
                recienteLocal.map(item => <ProductoRecienteCard key={item.id} item={item} />)
              )}
            </div>
          </div>

        </div>

        <div style={{ height: 24 }} />
      </div>

      {/* ── Modales de detalle ── */}
      <ModalDetalleStock       item={modalStock}     onClose={() => setModalStock(null)} />
      <ModalDetalleVencimiento item={modalVenc}      onClose={() => setModalVenc(null)} />
      <ModalNuevoProveedor     visible={modalNuevoProv} onClose={() => setModalNuevoProv(false)} onGuardar={handleGuardarProveedor} localFijo={activeLocal} />

      {/* ── KPI Flotantes ── */}
      <FloatingKPIList
        visible={kpiMetricas}
        onClose={() => setKpiMetricas(false)}
        title={`Productos inactivos · ${LOCAL_LABELS[activeLocal]}`}
        items={productosInactivos}
        renderItem={item => (
          <div key={item.id} className="div-kpi-item-row">
            <FiPackage size={14} />
            <span className="div-kpi-item-name">{item.nombre}</span>
            <button
              type="button"
              className="div-kpi-item-btn"
              onClick={() => setProductosData(prev => prev.map(p => p.id === item.id ? { ...p, activo: true } : p))}
            >
              Activar
            </button>
          </div>
        )}
      />

      <FloatingKPIList
        visible={kpiRecetas}
        onClose={() => setKpiRecetas(false)}
        title={`Recetas inactivas · ${LOCAL_LABELS[activeLocal]}`}
        items={recetasInactivas}
        renderItem={item => (
          <div key={item.id} className="div-kpi-item-row">
            <FiBookOpen size={14} />
            <span className="div-kpi-item-name">{item.nombre}</span>
            <button
              type="button"
              className="div-kpi-item-btn"
              onClick={() => setRecetasData(prev => prev.map(r => r.id === item.id ? { ...r, activa: true } : r))}
            >
              Activar
            </button>
          </div>
        )}
      />

      <FloatingKPIList
        visible={kpiProveedores}
        onClose={() => setKpiProveedores(false)}
        title={`Próximas visitas · ${LOCAL_LABELS[activeLocal]}`}
        items={provProximos}
        renderItem={p => (
          <button type="button" key={p.id} onClick={() => setModalProv(p)} className="div-kpi-prov-row">
            <span className="div-kpi-prov-avatar">{p.initials}</span>
            <span className="div-kpi-prov-info">
              <span className="div-kpi-prov-nombre">{p.nombre}</span>
              <span className="div-kpi-prov-empresa">{p.empresa}</span>
              <span className="div-kpi-prov-hint">Presiona para mas información</span>
            </span>
            <Badge label={`En ${nextVisitOffset(p.dias)} días`} level="info" />
          </button>
        )}
      />

      {/* Flotante Agenda HOY */}
      <FloatingSheet
        visible={agendaHoyModal}
        onClose={() => setAgendaHoyModal(false)}
        title="Proveedores que visitan hoy"
      >
        {provHoy.length === 0
          ? <p className="div-agenda-empty">Ningún proveedor visita hoy</p>
          : provHoy.map(p => (
              <button type="button" key={p.id} onClick={() => setModalProv(p)} className="div-kpi-prov-row" style={{ marginBottom: 10 }}>
                <span className="div-kpi-prov-avatar">{p.initials}</span>
                <span className="div-kpi-prov-info">
                  <span className="div-kpi-prov-nombre">{p.nombre}</span>
                  <span className="div-kpi-prov-empresa">{p.empresa}</span>
                  <span className="div-kpi-prov-hint">Presiona para mas información</span>
                </span>
              </button>
            ))
        }
      </FloatingSheet>

      {/* Reporte flotante */}
      <FloatingReporte
        visible={reporteModal}
        onClose={() => setReporteModal(false)}
        activeLocal={activeLocal}
        localLabels={LOCAL_LABELS}
      />

      {/* Recordatorio de proveedores al entrar */}
      <FloatingVisitanHoy
        visible={visitanHoyVisible}
        onClose={() => setVisitanHoyVisible(false)}
        onNoMostrarHoy={() => {
          setVisitanHoyVisible(false);
          setVisitanHoyDismissedToday(true);
        }}
        provHoy={provHoy}
      />

      {/*
        Modal de detalle de proveedor: se renderiza AL FINAL, después de
        FloatingKPIList / FloatingSheet, a propósito. Estos modales comparten
        el mismo z-index (mismo overlay/clase), así que cuando dos elementos
        position:fixed tienen igual z-index, gana el que está más abajo en el
        DOM. Si este modal se declara antes que la lista de proveedores,
        queda "detrás" al abrirse desde ahí. Al ir al final, siempre se
        pinta por encima sin importar desde qué lista/tarjeta se abrió.
      */}
      <ModalDetalleProveedor proveedor={modalProv} onClose={() => setModalProv(null)} />
    </>
  );
}