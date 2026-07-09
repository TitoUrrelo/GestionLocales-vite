import { useState, useEffect } from 'react';
import {
  FiMenu, FiBox, FiBookOpen, FiTruck, FiShoppingBag, FiArrowRight,
  FiPackage, FiCheckCircle, FiUser, FiLock, FiUsers, FiUserPlus, FiFileText, FiLogOut,
  FiPlusCircle,
} from 'react-icons/fi';

import { useAuth, localesAsignados } from '../../controllers/AuthContext';
import { logoutEmpleado } from '../../controllers/AuthControl';
import { useTheme } from '../../context/ThemeContext';
import SessionWarningBanner from '../../controllers/SessionWarningBanner';
import PersonalScreen from '../PersonalScreen';
import GestionProductosModal from './GestionProductosModal';
import GestionRecetasModal from './GestionRecetasModal';

import { Badge, LocalChip, ToggleSwitch } from './InventarioShared';
import {
  StockAlertCard, VencimientoCard, ProductoRecienteCard,
  ProveedorCard, CalendarioSemanal,
} from './AlertCards';
import { FloatingKPIList, FloatingSheet, FloatingReporte, FloatingVisitanHoy } from './FloatingSheet';
import {
  ModalDetalleStock, ModalDetalleVencimiento,
  ModalDetalleProveedor, ModalNuevoProveedor, ModalGestionProveedores,
} from './DetalleModals';
import DesktopVentasView from './DesktopVentasView';
import {
  STOCK_DATA, VENCIMIENTOS_DATA, LOCAL_LABELS, LOCAL_COLORS, LOCALES_LIST,
  HOY_IDX, TODAY_KEY,
} from './inventarioData';
import { getLevel, getVencLevel, nextVisitOffset } from './inventarioHelpers';
import { LOCAL_ICON_COMPONENTS } from './localIcons';

import '../../css/MobileLayout.css';

export default function MobileLayout({ state, actions }) {
  const { usuario } = useAuth();
  const { colors, isDark, toggle } = useTheme();

  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [personalVisible, setPersonalVisible] = useState(false);
  const [agendaHoyModal,  setAgendaHoyModal]  = useState(false);
  const [kpiMetricas,     setKpiMetricas]     = useState(false);
  const [kpiRecetas,      setKpiRecetas]      = useState(false);
  const [kpiProveedores,  setKpiProveedores]  = useState(false);
  const [reporteModal,    setReporteModal]    = useState(false);
  const [proveedoresGlobalVisible, setProveedoresGlobalVisible] = useState(false);
  // Local que disparó el modal de nuevo proveedor o reporte desde el drawer
  const [localDelModal,   setLocalDelModal]   = useState(null);
  // Modal de gestión de productos: { local, autoAbrirRegistro } o null si está cerrado
  const [modalProductosGestion, setModalProductosGestion] = useState(null);
  // Modal de gestión de recetas: { local } o null si está cerrado
  const [modalRecetasGestion,   setModalRecetasGestion]   = useState(null);

  const {
    activeLocal, modo, activeTab, proveedores, modalStock, modalVenc, modalProv, modalNuevoProv,
    recetasData, productosData, inventarioReciente,
    visitanHoyVisible, visitanHoyDismissedToday,
  } = state;
  const {
    setActiveLocal, setModo, setActiveTab, setModalStock, setModalVenc, setModalProv,
    setModalNuevoProv, handleGuardarProveedor, setRecetasData, setProductosData,
    setVisitanHoyVisible, setVisitanHoyDismissedToday,
  } = actions;

  // ── Permisos según rol ──
  const esCajero        = usuario?.rol === 'cajero';
  const localesUsuario  = localesAsignados(usuario?.localAsignado);
  const localesVisibles = LOCALES_LIST.filter(l => localesUsuario.includes(l));

  // Iniciales y rol para el drawer
  const inicialesUsuario = (usuario?.nombre ?? '')
    .split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
  const rolLabel = {
    admin:   'Administrador',
    cajero:  'Cajero',
    gerente: 'Gerente',
  }[usuario?.rol] ?? (usuario?.rol ?? '');

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
  const provLocal      = proveedores.filter(p => p.locales.includes(activeLocal));
  const provHoy        = provLocal.filter(p => p.dias.includes(HOY_IDX));
  const provProximos   = [...provLocal].sort((a, b) => nextVisitOffset(a.dias) - nextVisitOffset(b.dias));
  const recienteLocal  = inventarioReciente.filter(i => i.local === activeLocal && i.fecha === TODAY_KEY);
  const recetasInactivas   = recetasLocal.filter(r => !r.activa);
  const productosInactivos = productosLocal.filter(p => !p.activo);

  // Tabs: cajero ve Inventario y Proveedores
  const TABS = esCajero
    ? [
        { id: 'inventario',  label: 'Inventario',  icon: FiBox },
        { id: 'proveedores', label: 'Proveedores', icon: FiTruck },
      ]
    : [
        { id: 'inventario',  label: 'Inventario',  icon: FiBox },
        { id: 'recetas',     label: 'Recetas',     icon: FiBookOpen },
        { id: 'proveedores', label: 'Proveedores', icon: FiTruck },
      ];

  // Locales del selector de píldoras: solo los asignados al usuario
  const LOCALES_KPI = localesVisibles.map(id => ({ id, label: LOCAL_LABELS[id] }));

  useEffect(() => {
    if (provHoy.length > 0 && !visitanHoyDismissedToday) {
      setVisitanHoyVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocal]);

  // Variables CSS de tema para todo el layout
  const themeVars = {
    '--c-bg': colors.bg,
    '--c-surface': colors.surface,
    '--c-surface2': colors.surface2,
    '--c-border': colors.border,
    '--c-textPrimary': colors.textPrimary,
    '--c-textSecondary': colors.textSecondary,
    '--c-placeholder': colors.placeholder,
    '--c-btnBg': colors.btnBg,
    '--c-btnText': colors.btnText,
    '--c-accentText': colors.accentText,
  };

  return (
    <div className="ml-screen" style={themeVars}>

      {/* Overlay drawer */}
      {drawerOpen && <div className="ml-drawer-overlay" onClick={() => setDrawerOpen(false)} />}

      {/* ── Drawer ── */}
      <div className={`ml-drawer ${drawerOpen ? 'ml-drawer-open' : 'ml-drawer-closed'}`}>
        {/* Perfil dinámico */}
        <div className="ml-drawer-profile">
          <div className="ml-drawer-avatar">{inicialesUsuario}</div>
          <p className="ml-drawer-name">{usuario?.nombre ?? ''}</p>
          <p className="ml-drawer-role">{rolLabel}</p>
          <span className="ml-drawer-local-badge">
            {localesVisibles.length === 1 ? LOCAL_LABELS[localesVisibles[0]] : `${localesVisibles.length} locales`}
          </span>
        </div>

        <div className="ml-drawer-scroll">

          {/* CUENTA */}
          <div className="ml-drawer-section">
            <p className="ml-drawer-section-label">CUENTA</p>
            <button type="button" className="ml-drawer-btn">
              <FiUser size={15} />
              <span>Mi perfil</span>
            </button>
            <button
              type="button"
              className="ml-drawer-btn"
              onClick={() => {
                setDrawerOpen(false);
                setModalProductosGestion({ local: activeLocal, autoAbrirRegistro: true });
              }}
            >
              <FiPlusCircle size={15} />
              <span>Registrar producto</span>
            </button>
            <button type="button" className="ml-drawer-btn">
              <FiLock size={15} />
              <span>Cambiar contraseña</span>
            </button>
          </div>

          {/* APLICACIÓN */}
          <div className="ml-drawer-section">
            <p className="ml-drawer-section-label">APLICACIÓN</p>
            <div className="ml-drawer-btn ml-drawer-btn-between">
              <span className="ml-drawer-btn-label">{isDark ? '🌙' : '☀️'} Modo oscuro</span>
              <ToggleSwitch value={isDark} onToggle={toggle} />
            </div>
          </div>

          {/* GESTIÓN — acciones por local */}
          <div className="ml-drawer-section">
            <p className="ml-drawer-section-label">GESTIÓN</p>

            {!esCajero && (
              <button
                type="button"
                className="ml-drawer-btn"
                onClick={() => { setDrawerOpen(false); setPersonalVisible(true); }}
              >
                <FiUsers size={15} />
                <span>Gestión de usuarios</span>
              </button>
            )}

            <button
              type="button"
              className="ml-drawer-btn"
              onClick={() => { setDrawerOpen(false); setProveedoresGlobalVisible(true); }}
            >
              <FiUserPlus size={15} />
              <span>Gestión de proveedores</span>
            </button>

            <button
              type="button"
              className="ml-drawer-btn"
              onClick={() => {
                setLocalDelModal(activeLocal);
                setDrawerOpen(false);
                setModalNuevoProv(true);
              }}
            >
              <FiTruck size={15} />
              <span>Proveedores · {LOCAL_LABELS[activeLocal]}</span>
            </button>

            {!esCajero && (
              <button
                type="button"
                className="ml-drawer-btn"
                onClick={() => {
                  setLocalDelModal(activeLocal);
                  setDrawerOpen(false);
                  setReporteModal(true);
                }}
              >
                <FiFileText size={15} />
                <span>Reporte · {LOCAL_LABELS[activeLocal]}</span>
              </button>
            )}
          </div>
        </div>

        <div className="ml-drawer-bottom">
          <button
            type="button"
            className="ml-drawer-btn ml-drawer-logout"
            onClick={async () => { await logoutEmpleado(); }}
          >
            <FiLogOut size={15} color="#E24B4A" />
            <span style={{ color: '#E24B4A' }}>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="ml-header">
        <button type="button" onClick={() => setDrawerOpen(true)} className="ml-menu-btn">
          <FiMenu size={16} />
        </button>
        <div className="ml-header-center">
          <p className="ml-header-title">Dashboard Operacional</p>
          <p className="ml-header-sub">
            {localesVisibles.length === 1 ? LOCAL_LABELS[localesVisibles[0]] : `${localesVisibles.length} locales`}
          </p>
        </div>
        <div className="ml-header-spacer" />
      </div>

      <SessionWarningBanner />

      {/* ── Selector de local ── */}
      <div className="ml-local-bar">
        {LOCALES_KPI.map(loc => {
          const isActive  = activeLocal === loc.id;
          const col       = LOCAL_COLORS[loc.id];
          const LocalIcon = LOCAL_ICON_COMPONENTS[loc.id];
          return (
            <button
              type="button"
              key={loc.id}
              onClick={() => setActiveLocal(loc.id)}
              className="ml-loc-pill"
              style={{
                borderColor: isActive ? col.text : 'var(--c-border)',
                backgroundColor: isActive ? col.bg : 'transparent',
              }}
            >
              <LocalIcon size={16} color={isActive ? col.text : 'var(--c-textSecondary)'} />
              <span
                className="ml-loc-label"
                style={{ color: isActive ? col.text : 'var(--c-textSecondary)', fontWeight: isActive ? 600 : 400 }}
              >
                {loc.label}
              </span>
              {isActive && <span className="ml-loc-dot" style={{ backgroundColor: col.text }} />}
            </button>
          );
        })}
      </div>

      {/* ── Métricas KPI (solo en modo inventario) ── */}
      {modo === 'inventario' && (
        <div className="ml-metrics-row">
          {[
            { label: 'Productos',  value: stockLocal.length,              color: 'var(--c-textPrimary)',                                onPress: () => setKpiMetricas(true) },
            { label: 'Stock bajo', value: criticos.length + bajos.length, color: criticos.length > 0 ? '#E24B4A' : '#BA7517',           onPress: () => setKpiMetricas(true) },
            { label: 'Por vencer', value: porVencer.length,               color: porVencer.length > 0 ? '#BA7517' : 'var(--c-textPrimary)', onPress: () => setKpiMetricas(true) },
            ...(!esCajero ? [{ label: 'Recetas', value: recetasLocal.length, color: '#639922', onPress: () => setKpiRecetas(true) }] : []),
          ].map((m, i) => (
            <button type="button" key={i} onClick={m.onPress} className="ml-metric-card">
              <span className="ml-metric-label">{m.label}</span>
              <span className="ml-metric-value" style={{ color: m.color }}>{m.value}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Tabs (solo en modo inventario) ── */}
      {modo === 'inventario' && (
        <div className="ml-tab-bar">
          {TABS.map(tab => {
            const TabIcon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`ml-tab ${active ? 'ml-tab-active' : ''}`}
              >
                <TabIcon size={13} color={active ? 'var(--c-accentText)' : 'var(--c-textSecondary)'} />
                <span style={{ color: active ? 'var(--c-accentText)' : 'var(--c-textSecondary)', fontWeight: active ? 600 : 400 }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Contenido ── */}
      {modo === 'venta' ? (
        <div style={{ flex: 1, paddingBottom: 80 }}>
          <DesktopVentasView />
        </div>
      ) : (
        <div className="ml-scroll">

          {/* TAB INVENTARIO */}
          {activeTab === 'inventario' && (
            <div className="ml-tab-content">
              <div className="ml-nav-card">
                <span className="ml-nav-icon" style={{ backgroundColor: '#E6F1FB' }}>
                  <FiBox size={18} color="#0C447C" />
                </span>
                <div className="ml-nav-info">
                  <p className="ml-nav-title">Gestión de Inventario</p>
                  <p className="ml-nav-desc">Administrar productos de {LOCAL_LABELS[activeLocal]}</p>
                </div>
                <button
                  type="button"
                  className="ml-nav-btn"
                  onClick={() => setModalProductosGestion({ local: activeLocal, autoAbrirRegistro: false })}
                >
                  Ir <FiArrowRight size={12} />
                </button>
              </div>

              {(criticos.length > 0 || bajos.length > 0) && (
                <>
                  <p className="ml-section-label">
                    STOCK CRÍTICO · {criticos.length + bajos.length} PRODUCTO{criticos.length + bajos.length !== 1 ? 'S' : ''}
                  </p>
                  <div className="ml-list">
                    {[...criticos, ...bajos].map(item => <StockAlertCard key={item.id} item={item} onVerDetalle={setModalStock} />)}
                  </div>
                </>
              )}

              {vencLocal.length > 0 && (
                <>
                  <p className="ml-section-label" style={{ marginTop: 6 }}>POR VENCER · {vencLocal.length}</p>
                  <div className="ml-list">
                    {[...vencLocal].sort((a, b) => a.vence - b.vence).map(item => <VencimientoCard key={item.id} item={item} onVerDetalle={setModalVenc} />)}
                  </div>
                </>
              )}

              {recienteLocal.length > 0 && (
                <>
                  <p className="ml-section-label" style={{ marginTop: 6 }}>INGRESADOS HOY</p>
                  <div className="ml-list">
                    {recienteLocal.map(item => <ProductoRecienteCard key={item.id} item={item} />)}
                  </div>
                </>
              )}

              {criticos.length === 0 && bajos.length === 0 && vencLocal.length === 0 && recienteLocal.length === 0 && (
                <div className="ml-empty-card">
                  <FiCheckCircle size={20} color="#639922" />
                  <span>Sin alertas en {LOCAL_LABELS[activeLocal]}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB RECETAS (oculto para cajero) */}
          {activeTab === 'recetas' && !esCajero && (
            <div className="ml-tab-content">
              <div className="ml-nav-card">
                <span className="ml-nav-icon" style={{ backgroundColor: '#EAF3DE' }}>
                  <FiBookOpen size={18} color="#27500A" />
                </span>
                <div className="ml-nav-info">
                  <p className="ml-nav-title">Gestión de Recetas</p>
                  <p className="ml-nav-desc">Administrar recetas e insumos</p>
                </div>
                <button
                  type="button"
                  className="ml-nav-btn"
                  onClick={() => setModalRecetasGestion({ local: activeLocal })}
                >
                  Ir <FiArrowRight size={12} />
                </button>
              </div>

              <div className="ml-metrics-row" style={{ padding: 0 }}>
                {[
                  { label: 'Total',     value: totalRecetas,           color: 'var(--c-textPrimary)' },
                  { label: 'Activas',   value: activas,                color: '#639922' },
                  { label: 'Inactivas', value: totalRecetas - activas, color: '#7F8C8D' },
                ].map((m, i) => (
                  <button type="button" key={i} onClick={() => setKpiRecetas(true)} className="ml-metric-card">
                    <span className="ml-metric-label">{m.label}</span>
                    <span className="ml-metric-value" style={{ color: m.color }}>{m.value}</span>
                  </button>
                ))}
              </div>

              <p className="ml-section-label">
                RECETAS · {LOCAL_LABELS[activeLocal].toUpperCase()} · {recetasLocal.length}
              </p>
              {recetasLocal.length === 0 ? (
                <div className="ml-empty-card">
                  <span>Sin recetas para este local</span>
                </div>
              ) : (
                <div className="ml-list">
                  {recetasLocal.map(r => (
                    <div key={r.id} className="ml-receta-row">
                      <div style={{ flex: 1 }}>
                        <p className="ml-receta-nombre">{r.nombre}</p>
                        <div style={{ marginTop: 3 }}><LocalChip local={r.local} /></div>
                      </div>
                      <Badge label={r.activa ? 'Activa' : 'Inactiva'} level={r.activa ? 'ok' : 'info'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB PROVEEDORES */}
          {activeTab === 'proveedores' && (
            <div className="ml-tab-content">
              <p className="ml-section-label">AGENDA SEMANAL</p>
              <CalendarioSemanal proveedores={provLocal} onDiaPress={() => setAgendaHoyModal(true)} />

              {provHoy.length > 0 && (
                <>
                  <p className="ml-section-label" style={{ marginTop: 6 }}>VISITAN HOY · {provHoy.length}</p>
                  <div className="ml-list">
                    {provHoy.map(p => <ProveedorCard key={p.id} proveedor={p} onVerDetalle={setModalProv} />)}
                  </div>
                </>
              )}
              {provProximos.length > 0 && (
                <>
                  <p className="ml-section-label" style={{ marginTop: 6 }}>PRÓXIMAS VISITAS</p>
                  <div className="ml-list">
                    {provProximos.map(p => <ProveedorCard key={p.id} proveedor={p} onVerDetalle={setModalProv} />)}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Nav Bar (Ventas / Inventario) ── */}
      <div className="ml-bottom-bar">
        {[
          { id: 'venta',      label: 'Ventas',     icon: FiShoppingBag },
          { id: 'inventario', label: 'Inventario', icon: FiBox },
        ].map(m => {
          const active = modo === m.id;
          const MIcon  = m.icon;
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => setModo(m.id)}
              className={`ml-bottom-btn ${active ? 'ml-bottom-btn-active' : ''}`}
            >
              <MIcon size={20} color={active ? 'var(--c-accentText)' : 'var(--c-textSecondary)'} />
              <span style={{ color: active ? 'var(--c-accentText)' : 'var(--c-textSecondary)', fontWeight: active ? 600 : 400 }}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Modales ── */}
      {/*
        PersonalScreen se renderiza aquí, a nivel raíz de MobileLayout, y NO
        dentro de .ml-drawer. El drawer se anima con transform (slide open/close),
        y un transform en un ancestro se vuelve el containing block de cualquier
        hijo con position:fixed — por eso antes el modal quedaba encajonado al
        ancho angosto del drawer. Al vivir aquí, se posiciona respecto al viewport
        completo sin importar si el drawer está abierto o cerrado.
      */}
      <PersonalScreen
        visible={personalVisible}
        onClose={() => setPersonalVisible(false)}
      />

      <ModalGestionProveedores
        visible={proveedoresGlobalVisible}
        onClose={() => setProveedoresGlobalVisible(false)}
      />

      <ModalDetalleStock       item={modalStock}     onClose={() => setModalStock(null)} />
      <ModalDetalleVencimiento item={modalVenc}      onClose={() => setModalVenc(null)} />
      <ModalDetalleProveedor   proveedor={modalProv} onClose={() => setModalProv(null)} />
      <ModalNuevoProveedor
        visible={modalNuevoProv}
        onClose={() => setModalNuevoProv(false)}
        onGuardar={handleGuardarProveedor}
        localFijo={localDelModal ?? activeLocal}
      />

      {/* ── Flotantes ── */}
      <FloatingReporte
        visible={reporteModal}
        onClose={() => setReporteModal(false)}
        activeLocal={localDelModal ?? activeLocal}
        localLabels={LOCAL_LABELS}
      />

      <FloatingKPIList
        visible={kpiMetricas}
        onClose={() => setKpiMetricas(false)}
        title={`Productos inactivos · ${LOCAL_LABELS[activeLocal]}`}
        items={productosInactivos}
        renderItem={item => (
          <div key={item.id} className="ml-kpi-item-row">
            <FiPackage size={14} />
            <span className="ml-kpi-item-name">{item.nombre}</span>
            <button
              type="button"
              className="ml-kpi-item-btn"
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
          <div key={item.id} className="ml-kpi-item-row">
            <FiBookOpen size={14} />
            <span className="ml-kpi-item-name">{item.nombre}</span>
            <button
              type="button"
              className="ml-kpi-item-btn"
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
          <div key={p.id} className="ml-kpi-prov-row">
            <span className="ml-kpi-prov-avatar">{p.initials}</span>
            <div className="ml-kpi-prov-info">
              <p className="ml-kpi-prov-nombre">{p.nombre}</p>
              <p className="ml-kpi-prov-empresa">{p.empresa}</p>
            </div>
            <Badge label={`En ${nextVisitOffset(p.dias)} días`} level="info" />
          </div>
        )}
      />

      <FloatingSheet
        visible={agendaHoyModal}
        onClose={() => setAgendaHoyModal(false)}
        title="Proveedores que visitan hoy"
      >
        {provHoy.length === 0
          ? <p className="ml-agenda-empty">Ningún proveedor visita hoy</p>
          : provHoy.map(p => (
              <div key={p.id} className="ml-kpi-prov-row" style={{ marginBottom: 10 }}>
                <span className="ml-kpi-prov-avatar">{p.initials}</span>
                <div className="ml-kpi-prov-info">
                  <p className="ml-kpi-prov-nombre">{p.nombre}</p>
                  <p className="ml-kpi-prov-empresa">{p.empresa}</p>
                </div>
              </div>
            ))
        }
      </FloatingSheet>

      <FloatingVisitanHoy
        visible={modo === 'inventario' && visitanHoyVisible}
        onClose={() => setVisitanHoyVisible(false)}
        onNoMostrarHoy={() => {
          setVisitanHoyVisible(false);
          setVisitanHoyDismissedToday(true);
        }}
        provHoy={provHoy}
      />

      {modalProductosGestion && (
        <GestionProductosModal
          onClose={() => setModalProductosGestion(null)}
          local={modalProductosGestion.local}
          localLabel={LOCAL_LABELS[modalProductosGestion.local]}
          autoAbrirRegistro={modalProductosGestion.autoAbrirRegistro}
        />
      )}

      {modalRecetasGestion && (
        <GestionRecetasModal
          onClose={() => setModalRecetasGestion(null)}
          local={modalRecetasGestion.local}
          localLabel={LOCAL_LABELS[modalRecetasGestion.local]}
        />
      )}
    </div>
  );
}