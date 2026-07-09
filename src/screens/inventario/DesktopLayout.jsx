import { useState, useEffect } from 'react';
import {
  FiChevronUp, FiChevronDown, FiBox, FiBookOpen, FiTruck, FiFileText,
  FiUser, FiUsers, FiUserPlus, FiLogOut, FiAlertTriangle, FiClock, FiPlusCircle,
} from 'react-icons/fi';

import { useAuth, localesAsignados } from '../../controllers/AuthContext';
import { logoutEmpleado } from '../../controllers/AuthControl';
import { useTheme } from '../../context/ThemeContext';
import SessionWarningBanner from '../../controllers/SessionWarningBanner';
import PersonalScreen from '../PersonalScreen';
import { ModalGestionProveedores } from './DetalleModals';
import GestionProductosModal from './GestionProductosModal';
import GestionRecetasModal from './GestionRecetasModal';

import { ToggleSwitch, ModoToggleDesktop } from './InventarioShared';
import { FloatingReporte } from './FloatingSheet';
import DesktopVentasView from './DesktopVentasView';
import DesktopInventarioView from './DesktopInventarioView';
import { STOCK_DATA, VENCIMIENTOS_DATA, LOCAL_LABELS, LOCALES_LIST, HOY_IDX } from './inventarioData';
import { getLevel, getVencLevel } from './inventarioHelpers';
import { LOCAL_ICON_COMPONENTS } from './localIcons';

import '../../css/DesktopLayout.css';

export default function DesktopLayout({ state, actions }) {
  const { usuario } = useAuth();
  const { colors, isDark, toggle } = useTheme();

  const [personalVisible, setPersonalVisible] = useState(false);
  const [reporteModal,    setReporteModal]    = useState(false);
  const [proveedoresGlobalVisible, setProveedoresGlobalVisible] = useState(false);
  // Modal de gestión de productos: { local, autoAbrirRegistro } o null si está cerrado
  const [modalProductosGestion, setModalProductosGestion] = useState(null);
  // Modal de gestión de recetas: { local } o null si está cerrado
  const [modalRecetasGestion,   setModalRecetasGestion]   = useState(null);

  const {
    activeLocal, modo, proveedores, modalStock, modalVenc, modalProv, modalNuevoProv,
    recetasData, productosData, inventarioReciente,
    visitanHoyVisible, visitanHoyDismissedToday,
  } = state;
  const {
    setActiveLocal, setModo, setModalStock, setModalVenc, setModalProv,
    setModalNuevoProv, handleGuardarProveedor, setRecetasData, setProductosData,
    setVisitanHoyVisible, setVisitanHoyDismissedToday,
  } = actions;

  const [localExpanded, setLocalExpanded] = useState(activeLocal);
  // Local desde el que se abrió el modal de proveedores o reporte (puede diferir de activeLocal)
  const [localDelModal, setLocalDelModal] = useState(activeLocal);

  // ── Permisos según rol ──
  const esCajero       = usuario?.rol === 'cajero';
  const localesUsuario = localesAsignados(usuario?.localAsignado);
  const localesVisibles = LOCALES_LIST.filter(l => localesUsuario.includes(l));

  // Subitems del desplegable: cajero ve Inventario y Proveedores
  const SIDEBAR_SUBITEMS = esCajero
    ? [
        { id: 'inventario',  label: 'Inventario',  icon: FiBox },
        { id: 'proveedores', label: 'Proveedores', icon: FiTruck },
      ]
    : [
        { id: 'inventario',  label: 'Inventario',  icon: FiBox },
        { id: 'recetas',     label: 'Recetas',     icon: FiBookOpen },
        { id: 'proveedores', label: 'Proveedores', icon: FiTruck },
        { id: 'reporte',     label: 'Reporte',     icon: FiFileText },
      ];

  // Iniciales y rol para mostrar en el perfil
  const inicialesUsuario = (usuario?.nombre ?? '')
    .split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
  const rolLabel = {
    admin:   'Administrador',
    cajero:  'Cajero',
    gerente: 'Gerente',
  }[usuario?.rol] ?? (usuario?.rol ?? '');

  // Derivados necesarios para el sidebar y topbar
  const stockLocal      = STOCK_DATA.filter(i => i.local === activeLocal);
  const vencLocal       = VENCIMIENTOS_DATA.filter(i => i.local === activeLocal);
  const criticos        = stockLocal.filter(i => ['critical', 'out'].includes(getLevel(i)));
  const bajos           = stockLocal.filter(i => getLevel(i) === 'low');
  const porVencer       = vencLocal.filter(i => getVencLevel(i.vence) !== 'soon');
  const cntCriticoLocal = criticos.length + bajos.length;
  const cntVencLocal    = porVencer.length;
  const provLocal       = proveedores.filter(p => p.locales.includes(activeLocal));
  const provHoy         = provLocal.filter(p => p.dias.includes(HOY_IDX));

  // Recordatorio al entrar en un local (una vez por día)
  useEffect(() => {
    if (modo === 'inventario' && provHoy.length > 0 && !visitanHoyDismissedToday) {
      setVisitanHoyVisible(true);
    } else {
      setVisitanHoyVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocal, modo, provHoy.length, visitanHoyDismissedToday]);

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
    <div className="dl-screen" style={themeVars}>

      {/* ── Sidebar ── */}
      <div className="dl-sidebar">

        {/* Marca */}
        <div className="dl-sb-section dl-sb-brand">
          <p className="dl-sb-brand-title">Dashboard</p>
          <p className="dl-sb-brand-sub">
            Operacional · {localesVisibles.length} {localesVisibles.length === 1 ? 'local' : 'locales'}
          </p>
        </div>

        {/* Perfil */}
        <div className="dl-sb-profile">
          <div className="dl-sb-avatar">{inicialesUsuario}</div>
          <div className="dl-sb-profile-info">
            <p className="dl-sb-profile-name">{usuario.nombre}</p>
            <p className="dl-sb-profile-role">{rolLabel}</p>
          </div>
        </div>

        <div className="dl-sb-scroll">

          {/* Toggle Ventas / Inventario */}
          <div style={{ paddingTop: 12 }}>
            <p className="dl-sb-sec-label" style={{ padding: '0 12px', marginBottom: 6 }}>MODO</p>
            <ModoToggleDesktop modo={modo} setModo={setModo} />
          </div>

          {/* Selector de local con subitems */}
          <div className="dl-sb-locales">
            <p className="dl-sb-sec-label" style={{ padding: '0 12px', marginBottom: 6 }}>LOCAL ACTIVO</p>
            {localesVisibles.map(local => {
              const isActive   = activeLocal === local;
              const isExpanded = localExpanded === local;
              const LocalIcon  = LOCAL_ICON_COMPONENTS[local];
              return (
                <div key={local}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLocal(local);
                      setLocalExpanded(isExpanded ? null : local);
                    }}
                    className={`dl-sb-local-btn ${isActive ? `dl-sb-local-btn-active dl-local-${local}` : ''}`}
                  >
                    <span className={`dl-sb-local-dot ${isActive ? `dl-local-dot-${local}` : ''}`} />
                    <LocalIcon size={14} />
                    <span className="dl-sb-local-label">{LOCAL_LABELS[local]}</span>
                    {isExpanded ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                  </button>

                  {/* Sub-items del local */}
                  {isExpanded && (
                    <div className="dl-subitems-wrap">
                      {SIDEBAR_SUBITEMS.map(sub => {
                        const SubIcon = sub.icon;
                        return (
                          <button
                            type="button"
                            key={sub.id}
                            onClick={() => {
                              if (sub.id === 'inventario') {
                                setModalProductosGestion({ local, autoAbrirRegistro: false });
                              } else if (sub.id === 'recetas') {
                                setModalRecetasGestion({ local });
                              } else if (sub.id === 'proveedores') {
                                setLocalDelModal(local);
                                setModalNuevoProv(true);
                              } else if (sub.id === 'reporte') {
                                setLocalDelModal(local);
                                setReporteModal(true);
                              }
                            }}
                            className="dl-subitem"
                          >
                            <SubIcon size={12} />
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Fondo sidebar */}
        <div className="dl-sb-bottom">
          <button type="button" className="dl-sb-bottom-btn">
            <FiUser size={13} />
            <span>Mi perfil</span>
          </button>

          <button
            type="button"
            className="dl-sb-bottom-btn"
            onClick={() => setModalProductosGestion({ local: activeLocal, autoAbrirRegistro: true })}
          >
            <FiPlusCircle size={13} />
            <span>Registrar producto</span>
          </button>

          {!esCajero && (
            <button type="button" className="dl-sb-bottom-btn" onClick={() => setPersonalVisible(true)}>
              <FiUsers size={13} />
              <span>Gestión de usuarios</span>
            </button>
          )}

          <button type="button" className="dl-sb-bottom-btn" onClick={() => setProveedoresGlobalVisible(true)}>
            <FiUserPlus size={13} />
            <span>Gestión de proveedores</span>
          </button>

          {/* Modo oscuro con toggle */}
          <div className="dl-sb-bottom-btn dl-sb-bottom-btn-between">
            <span className="dl-sb-bottom-btn-label">
              {isDark ? '🌙' : '☀️'} Modo oscuro
            </span>
            <ToggleSwitch value={isDark} onToggle={toggle} />
          </div>

          <button
            type="button"
            className="dl-sb-bottom-btn dl-sb-logout-btn"
            onClick={async () => { await logoutEmpleado(); }}
          >
            <FiLogOut size={13} color="#E24B4A" />
            <span className="dl-sb-logout-text">Cerrar sesión</span>
          </button>

          <PersonalScreen
            visible={personalVisible}
            onClose={() => setPersonalVisible(false)}
          />
          <ModalGestionProveedores
            visible={proveedoresGlobalVisible}
            onClose={() => setProveedoresGlobalVisible(false)}
          />
        </div>
      </div>

      {/* ── Main ── */}
      <div className="dl-main">

        {/* Topbar */}
        <div className="dl-topbar">
          <div>
            <p className="dl-topbar-title">{LOCAL_LABELS[activeLocal]}</p>
            <p className="dl-topbar-sub">
              {modo === 'inventario' ? 'Inventario y Recetas · Dashboard general' : 'Módulo de ventas · Próximamente'}
            </p>
          </div>
          {modo === 'inventario' && (
            <div className="dl-topbar-badges">
              {cntCriticoLocal > 0 && (
                <span className="dl-topbar-badge" style={{ backgroundColor: '#FCEBEB', color: '#791F1F' }}>
                  <FiAlertTriangle size={11} />
                  {cntCriticoLocal} stock crítico
                </span>
              )}
              {cntVencLocal > 0 && (
                <span className="dl-topbar-badge" style={{ backgroundColor: '#FAEEDA', color: '#633806', marginLeft: 6 }}>
                  <FiClock size={11} />
                  {cntVencLocal} por vencer
                </span>
              )}
            </div>
          )}
        </div>

        <SessionWarningBanner />

        {/* ── Contenido: delega a la vista correspondiente ── */}
        {modo === 'venta' ? (
          <DesktopVentasView />
        ) : (
          <DesktopInventarioView
            activeLocal={activeLocal}
            proveedores={proveedores}
            recetasData={recetasData}
            productosData={productosData}
            inventarioReciente={inventarioReciente}
            modalStock={modalStock}         setModalStock={setModalStock}
            modalVenc={modalVenc}           setModalVenc={setModalVenc}
            modalProv={modalProv}           setModalProv={setModalProv}
            modalNuevoProv={modalNuevoProv} setModalNuevoProv={setModalNuevoProv}
            handleGuardarProveedor={handleGuardarProveedor}
            setRecetasData={setRecetasData}
            setProductosData={setProductosData}
            visitanHoyVisible={visitanHoyVisible}
            setVisitanHoyVisible={setVisitanHoyVisible}
            visitanHoyDismissedToday={visitanHoyDismissedToday}
            setVisitanHoyDismissedToday={setVisitanHoyDismissedToday}
          />
        )}
      </div>

      <FloatingReporte
        visible={reporteModal}
        onClose={() => setReporteModal(false)}
        activeLocal={localDelModal}
        localLabels={LOCAL_LABELS}
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