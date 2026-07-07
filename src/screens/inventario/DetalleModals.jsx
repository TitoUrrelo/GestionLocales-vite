import { useState, useEffect } from 'react';
import {
  FiX, FiAlertOctagon, FiClock, FiCalendar, FiClipboard,
  FiCheckCircle, FiAlertTriangle, FiArrowDown, FiChevronLeft,
  FiChevronRight, FiUsers, FiUserPlus,
} from 'react-icons/fi';
import { Badge, LocalChip, ToggleSwitch } from './InventarioShared';
import { STOCK_DATA, LOCAL_LABELS, LOCAL_COLORS, DIAS, DIAS_SEMANA, HOY_IDX } from './inventarioData';
import { getLevel, getPct, getVencLevel } from './inventarioHelpers';
import {
  crearProveedorGlobal, actualizarProveedorGlobal,
  obtenerProveedoresGlobalesDisponibles, asignarProveedorExistenteALocal,
  actualizarDiasProveedorLocal, cambiarEstadoProveedor,
  suscribirProveedoresPorLocal, suscribirProveedoresGlobales,
} from '../../control/ProveedorControl';
import { getInitials } from '../../models/ProveedorModel';
import '../../css/DetalleModals.css';

// ─── Modal detalle de stock ───────────────────────────────────────────────────
export function ModalDetalleStock({ item, onClose }) {
  if (!item) return null;
  const level      = getLevel(item);
  const pct        = getPct(item);
  const isCritical = ['critical', 'out'].includes(level);
  const barColor   = isCritical ? '#E24B4A' : level === 'low' ? '#BA7517' : '#639922';

  return (
    <div className="inv-modal-overlay" onClick={onClose}>
      <div className="inv-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-handle" />
        <div className="inv-modal-row-between">
          <div>
            <h2 className="inv-modal-title">{item.nombre}</h2>
            <div style={{ marginTop: 4 }}><LocalChip local={item.local} /></div>
          </div>
          <button type="button" className="inv-modal-close" onClick={onClose} aria-label="Cerrar">
            <FiX size={20} />
          </button>
        </div>

        <div className="inv-modal-stats-row">
          {[
            { label: 'Stock actual', value: `${item.qty} ${item.unit}` },
            { label: 'Stock mínimo', value: `${item.min} ${item.unit}` },
            { label: 'Porcentaje',   value: `${pct}%` },
          ].map((stat, i) => (
            <div key={i} className="inv-modal-statbox">
              <span className="inv-modal-statlabel">{stat.label}</span>
              <span className="inv-modal-statvalue">{stat.value}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="inv-modal-row-between" style={{ marginBottom: 6 }}>
            <span className="inv-modal-label">Nivel de stock</span>
            <Badge
              label={level === 'out' ? 'Sin stock' : isCritical ? 'Crítico' : level === 'low' ? 'Stock bajo' : 'Normal'}
              level={isCritical ? 'critical' : level === 'low' ? 'low' : 'ok'}
            />
          </div>
          <div className="inv-modal-bigbar-bg">
            <div className="inv-modal-bigbar-fill" style={{ width: `${pct}%`, backgroundColor: barColor }} />
          </div>
          <div className="inv-modal-row-between" style={{ marginTop: 4 }}>
            <span className="inv-modal-barlabel">0 {item.unit}</span>
            <span className="inv-modal-barlabel">{item.max} {item.unit}</span>
          </div>
        </div>

        <div className="inv-modal-infobox">
          <p className="inv-modal-infotitle">Recomendación</p>
          <p className="inv-modal-infotext">
            {isCritical
              ? `Solicitar reposición urgente. Faltan ${(item.min - item.qty).toFixed(1)} ${item.unit} para alcanzar el mínimo.`
              : `Considerar pedido pronto. Stock actual es ${pct}% del máximo.`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Modal detalle de vencimiento ────────────────────────────────────────────
export function ModalDetalleVencimiento({ item, onClose }) {
  if (!item) return null;
  const level      = getVencLevel(item.vence);
  const isCritical = level === 'critical';

  const boxColors = isCritical
    ? { bg: '#FCEBEB', border: '#F5A6A6', text: '#791F1F' }
    : level === 'warning'
    ? { bg: '#FAEEDA', border: '#FAC775', text: '#633806' }
    : { bg: '#EAF3DE', border: '#B8DFA0', text: '#27500A' };

  const Icon = isCritical ? FiAlertOctagon : level === 'warning' ? FiClock : FiCalendar;

  return (
    <div className="inv-modal-overlay" onClick={onClose}>
      <div className="inv-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-handle" />
        <div className="inv-modal-row-between">
          <div>
            <h2 className="inv-modal-title">{item.nombre}</h2>
            <div style={{ marginTop: 4 }}><LocalChip local={item.local} /></div>
          </div>
          <button type="button" className="inv-modal-close" onClick={onClose} aria-label="Cerrar">
            <FiX size={20} />
          </button>
        </div>

        <div className="inv-modal-stats-row">
          {[
            { label: 'Vence en', value: `${item.vence} ${item.unit}` },
            { label: 'Cantidad', value: `${item.qty} ${item.unitQty}` },
            { label: 'Lote',     value: item.lote },
          ].map((stat, i) => (
            <div key={i} className="inv-modal-statbox">
              <span className="inv-modal-statlabel">{stat.label}</span>
              <span className="inv-modal-statvalue" style={{ fontSize: 13 }}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="inv-modal-warningbox" style={{ backgroundColor: boxColors.bg, borderColor: boxColors.border }}>
          <Icon size={18} color={boxColors.text} />
          <span style={{ color: boxColors.text }}>
            {isCritical
              ? 'Producto vence hoy o mañana. Revisar uso urgente o retirar del inventario.'
              : level === 'warning'
              ? `Vence en ${item.vence} días. Priorizar su uso.`
              : `Vence en ${item.vence} días. Monitorear consumo.`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Modal detalle de proveedor ──────────────────────────────────────────────
export function ModalDetalleProveedor({ proveedor, onClose }) {
  if (!proveedor) return null;
  const visitaHoy = proveedor.dias.includes(HOY_IDX);

  const stockRecomendado = STOCK_DATA.filter(item =>
    proveedor.locales.includes(item.local) && ['critical', 'out', 'low'].includes(getLevel(item))
  ).sort((a, b) => {
    const order = { out: 0, critical: 1, low: 2 };
    return order[getLevel(a)] - order[getLevel(b)];
  });

  return (
    <div className="inv-modal-overlay" onClick={onClose}>
      <div className="inv-modal-sheet inv-modal-sheet-tall" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-handle" />
        <div className="inv-modal-row-between">
          <div className="inv-modal-row">
            <span className="inv-avatar-lg">{proveedor.initials}</span>
            <div style={{ marginLeft: 12 }}>
              <h2 className="inv-modal-title">{proveedor.nombre}</h2>
              <p className="inv-modal-provtipo">{proveedor.empresa}</p>
            </div>
          </div>
          <button type="button" className="inv-modal-close" onClick={onClose} aria-label="Cerrar">
            <FiX size={20} />
          </button>
        </div>

        <div className="inv-modal-scroll">
          <div className="inv-modal-infotable">
            {[
              { k: 'Empresa',        v: proveedor.empresa },
              { k: 'Teléfono',       v: proveedor.telefono },
              { k: 'Días de visita', v: proveedor.dias.map(d => DIAS[d]).join(' · ') },
            ].map((row, i) => (
              <div key={i} className="inv-modal-inforow">
                <span className="inv-modal-infokey">{row.k}</span>
                <span className="inv-modal-infoval">{row.v}</span>
              </div>
            ))}
          </div>

          <p className="inv-modal-label" style={{ marginBottom: 7 }}>LOCALES ABASTECIDOS</p>
          <div className="inv-modal-row" style={{ gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {proveedor.locales.map(l => <LocalChip key={l} local={l} />)}
          </div>

          {visitaHoy && (
            <div className="inv-modal-warningbox" style={{ marginBottom: 16 }}>
              <FiClipboard size={18} color="#633806" />
              <span>Este proveedor visita hoy. Recuerda preparar el pedido.</span>
            </div>
          )}

          <p className="inv-modal-label" style={{ marginBottom: 10 }}>
            SUGERENCIA DE COMPRA · {stockRecomendado.length} PRODUCTO{stockRecomendado.length !== 1 ? 'S' : ''}
          </p>

          {stockRecomendado.length === 0 ? (
            <div className="inv-modal-recom-empty">
              <FiCheckCircle size={20} color="#639922" />
              <span>Sin stock crítico en los locales de este proveedor</span>
            </div>
          ) : (
            <div className="inv-modal-recom-list">
              {stockRecomendado.map(item => {
                const level       = getLevel(item);
                const isCritical  = ['critical', 'out'].includes(level);
                const accentColor = isCritical ? '#E24B4A' : '#BA7517';
                const bgColor     = isCritical ? '#FCEBEB' : '#FAEEDA';
                const faltante    = Math.max(0, item.min - item.qty);
                const badgeLabel  = level === 'out' ? 'Sin stock' : isCritical ? 'Crítico' : 'Stock bajo';
                return (
                  <div key={item.id} className="inv-modal-recom-card" style={{ borderLeftColor: accentColor }}>
                    <span className="inv-modal-recom-icon" style={{ backgroundColor: bgColor }}>
                      {isCritical ? <FiAlertTriangle size={14} color={accentColor} /> : <FiArrowDown size={14} color={accentColor} />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="inv-modal-row-between" style={{ marginBottom: 2 }}>
                        <span className="inv-modal-recom-nombre">{item.nombre}</span>
                        <Badge label={badgeLabel} level={isCritical ? 'critical' : 'low'} />
                      </div>
                      <LocalChip local={item.local} />
                      <div className="inv-modal-row-between" style={{ marginTop: 6 }}>
                        <span className="inv-modal-recom-meta">
                          Stock: <b style={{ color: accentColor }}>{item.qty} {item.unit}</b>
                        </span>
                        {faltante > 0 && (
                          <span className="inv-modal-recom-sugerido" style={{ color: accentColor }}>
                            Pedir &ge; {faltante.toFixed(1)} {item.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ─── Modal gestión de proveedores (nodo global) ──────────────────────────────
// Vive en el nodo GLOBAL proveedor/{id}: nombre, empresa, teléfono. No sabe
// nada de locales, activo ni días de visita — eso se define después, al
// asignar el proveedor a un local puntual (ver ModalNuevoProveedor más abajo).
// Se abre desde el sidebar/drawer, fuera del contexto de un local.
//
// Tiene 2 pestañas:
//  - "Nuevo":  crea un proveedor en proveedor/{id}.
//  - "Editar": lista TODOS los proveedores del nodo global (en vivo) y
//              permite editar nombre/teléfono. La empresa no es editable.
export function ModalGestionProveedores({ visible, onClose }) {
  const FORM_INIT = { nombre: '', empresa: '', telefono: '' };

  const [tab, setTab] = useState('nuevo'); // 'nuevo' | 'editar'

  // ── Pestaña "Nuevo" ──
  const [form, setForm]           = useState(FORM_INIT);
  const [errors, setErrors]       = useState({});
  const [guardando, setGuardando] = useState(false);

  // ── Pestaña "Editar" ──
  const [listaGlobal, setListaGlobal]     = useState([]);
  const [proveedorEditId, setProveedorEditId] = useState(null);
  const [editForm, setEditForm]           = useState({ nombre: '', telefono: '' });
  const [editErrors, setEditErrors]       = useState({});
  const [editGuardando, setEditGuardando] = useState(false);

  // Se suscribe a TODOS los proveedores globales mientras el modal esté abierto.
  useEffect(() => {
    if (!visible) return undefined;
    const cancelar = suscribirProveedoresGlobales(setListaGlobal);
    return cancelar;
  }, [visible]);

  const proveedorSeleccionado = listaGlobal.find(p => p.id === proveedorEditId) ?? null;

  function limpiarNombre(valor) {
    return valor.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü\s]/g, '');
  }

  function limpiarTelefonoInput(valor) {
    return valor.replace(/\D/g, '').slice(0, 9);
  }

  async function handleGuardarNuevo(e) {
    e.preventDefault();
    setErrors({});
    setGuardando(true);
    try {
      await crearProveedorGlobal(form);
      setForm(FORM_INIT);
      onClose();
    } catch (err) {
      setErrors(err?.errores ?? { general: 'No se pudo guardar el proveedor. Intenta nuevamente.' });
    } finally {
      setGuardando(false);
    }
  }

  function handleSeleccionarProveedor(p) {
    setProveedorEditId(p.id);
    setEditForm({ nombre: p.nombre, telefono: p.telefono });
    setEditErrors({});
  }

  function handleVolverALista() {
    setProveedorEditId(null);
    setEditForm({ nombre: '', telefono: '' });
    setEditErrors({});
  }

  async function handleGuardarEdicion(e) {
    e.preventDefault();
    if (!proveedorEditId) return;
    setEditErrors({});
    setEditGuardando(true);
    try {
      await actualizarProveedorGlobal(proveedorEditId, editForm);
      handleVolverALista();
    } catch (err) {
      setEditErrors(err?.errores ?? { general: 'No se pudieron guardar los cambios. Intenta nuevamente.' });
    } finally {
      setEditGuardando(false);
    }
  }

  function handleClose() {
    setTab('nuevo');
    setForm(FORM_INIT);
    setErrors({});
    handleVolverALista();
    onClose();
  }

  function handleCambiarTab(nuevoTab) {
    setTab(nuevoTab);
    setErrors({});
    handleVolverALista();
  }

  if (!visible) return null;

  return (
    <div className="inv-modal-overlay" onClick={handleClose}>
      <div className="inv-modal-sheet inv-modal-sheet-tall" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-handle" />
        <div className="inv-modal-row-between" style={{ marginBottom: 6 }}>
          <h2 className="inv-modal-title">{tab === 'nuevo' ? 'Nuevo proveedor' : 'Proveedores registrados'}</h2>
          <button type="button" className="inv-modal-close" onClick={handleClose} aria-label="Cerrar">
            <FiX size={20} />
          </button>
        </div>

        <p className="inv-modal-hint-inline" style={{ marginBottom: 14, display: 'block' }}>
          Datos generales del proveedor. Para asignarlo a un local y definir sus días de visita, usa "Proveedores" dentro de cada local.
        </p>

        {/* Selector de pestaña */}
        <div className="inv-modal-row" style={{ gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => handleCambiarTab('nuevo')}
            className="inv-modal-btn"
            style={{
              flex: 1,
              backgroundColor: tab === 'nuevo' ? 'var(--c-btnBg, #1B1B1B)' : 'transparent',
              color: tab === 'nuevo' ? 'var(--c-btnText, #fff)' : 'var(--c-textSecondary, #7F8C8D)',
              border: '1px solid var(--c-border, #E4E2DD)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <FiUserPlus size={14} /> Nuevo
          </button>
          <button
            type="button"
            onClick={() => handleCambiarTab('editar')}
            className="inv-modal-btn"
            style={{
              flex: 1,
              backgroundColor: tab === 'editar' ? 'var(--c-btnBg, #1B1B1B)' : 'transparent',
              color: tab === 'editar' ? 'var(--c-btnText, #fff)' : 'var(--c-textSecondary, #7F8C8D)',
              border: '1px solid var(--c-border, #E4E2DD)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <FiUsers size={14} /> Editar
          </button>
        </div>

        {/* ── Pestaña Nuevo ── */}
        {tab === 'nuevo' && (
          <form className="inv-modal-scroll" onSubmit={handleGuardarNuevo}>
            {errors.general && <p className="inv-modal-errortext" style={{ marginBottom: 10 }}>{errors.general}</p>}

            <div className="inv-modal-formgroup">
              <label className="inv-modal-formlabel">
                Nombre del contacto <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input
                className="inv-modal-input"
                style={errors.nombre ? { borderColor: '#E24B4A' } : undefined}
                type="text"
                placeholder="Ej: Juan Pérez"
                value={form.nombre}
                onChange={(e) => setForm(prev => ({ ...prev, nombre: limpiarNombre(e.target.value) }))}
              />
              {errors.nombre && <p className="inv-modal-errortext">{errors.nombre}</p>}
            </div>

            <div className="inv-modal-formgroup">
              <label className="inv-modal-formlabel">
                Empresa <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input
                className="inv-modal-input"
                style={errors.empresa ? { borderColor: '#E24B4A' } : undefined}
                type="text"
                placeholder="Ej: Distribuidora Central SpA"
                value={form.empresa}
                onChange={(e) => setForm(prev => ({ ...prev, empresa: e.target.value }))}
              />
              {errors.empresa && <p className="inv-modal-errortext">{errors.empresa}</p>}
            </div>

            <div className="inv-modal-formgroup">
              <label className="inv-modal-formlabel">
                Teléfono <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input
                className="inv-modal-input"
                style={errors.telefono ? { borderColor: '#E24B4A' } : undefined}
                type="tel"
                inputMode="numeric"
                placeholder="912345678"
                value={form.telefono}
                onChange={(e) => setForm(prev => ({ ...prev, telefono: limpiarTelefonoInput(e.target.value) }))}
              />
              {errors.telefono && <p className="inv-modal-errortext">{errors.telefono}</p>}
            </div>

            <div className="inv-modal-row" style={{ gap: 10, marginTop: 6, marginBottom: 8 }}>
              <button type="button" className="inv-modal-btn inv-modal-btn-secondary" onClick={handleClose}>
                Cancelar
              </button>
              <button type="submit" className="inv-modal-btn inv-modal-btn-primary" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar proveedor'}
              </button>
            </div>
          </form>
        )}

        {/* ── Pestaña Editar: lista ── */}
        {tab === 'editar' && !proveedorSeleccionado && (
          <div className="inv-modal-scroll">
            {listaGlobal.length === 0 ? (
              <div className="inv-modal-recom-empty">
                <FiCheckCircle size={20} color="#639922" />
                <span>Aún no hay proveedores registrados</span>
              </div>
            ) : (
              <div className="inv-modal-recom-list">
                {listaGlobal.map(p => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleSeleccionarProveedor(p)}
                    className="inv-modal-row-between"
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 12px',
                      border: '1px solid var(--c-border, #E4E2DD)', borderRadius: 10,
                      background: 'transparent', cursor: 'pointer', marginBottom: 8,
                    }}
                  >
                    <div className="inv-modal-row" style={{ gap: 10 }}>
                      <span className="inv-avatar-lg" style={{ width: 34, height: 34, fontSize: 13 }}>{getInitials(p.nombre)}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{p.nombre}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--c-textSecondary, #7F8C8D)' }}>{p.empresa}</p>
                      </div>
                    </div>
                    <FiChevronRight size={16} color="var(--c-textSecondary, #7F8C8D)" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Pestaña Editar: formulario del proveedor seleccionado ── */}
        {tab === 'editar' && proveedorSeleccionado && (
          <form className="inv-modal-scroll" onSubmit={handleGuardarEdicion}>
            <button
              type="button"
              onClick={handleVolverALista}
              className="inv-modal-row"
              style={{ gap: 4, background: 'none', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', color: 'var(--c-textSecondary, #7F8C8D)' }}
            >
              <FiChevronLeft size={16} /> Volver a la lista
            </button>

            {editErrors.general && <p className="inv-modal-errortext" style={{ marginBottom: 10 }}>{editErrors.general}</p>}

            <div className="inv-modal-formgroup">
              <label className="inv-modal-formlabel">Empresa</label>
              <input className="inv-modal-input" type="text" value={proveedorSeleccionado.empresa} disabled />
            </div>

            <div className="inv-modal-formgroup">
              <label className="inv-modal-formlabel">
                Nombre del contacto <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input
                className="inv-modal-input"
                style={editErrors.nombre ? { borderColor: '#E24B4A' } : undefined}
                type="text"
                value={editForm.nombre}
                onChange={(e) => setEditForm(prev => ({ ...prev, nombre: limpiarNombre(e.target.value) }))}
              />
              {editErrors.nombre && <p className="inv-modal-errortext">{editErrors.nombre}</p>}
            </div>

            <div className="inv-modal-formgroup">
              <label className="inv-modal-formlabel">
                Teléfono <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input
                className="inv-modal-input"
                style={editErrors.telefono ? { borderColor: '#E24B4A' } : undefined}
                type="tel"
                inputMode="numeric"
                value={editForm.telefono}
                onChange={(e) => setEditForm(prev => ({ ...prev, telefono: limpiarTelefonoInput(e.target.value) }))}
              />
              {editErrors.telefono && <p className="inv-modal-errortext">{editErrors.telefono}</p>}
            </div>

            <div className="inv-modal-row" style={{ gap: 10, marginTop: 6, marginBottom: 8 }}>
              <button type="button" className="inv-modal-btn inv-modal-btn-secondary" onClick={handleVolverALista}>
                Cancelar
              </button>
              <button type="submit" className="inv-modal-btn inv-modal-btn-primary" disabled={editGuardando}>
                {editGuardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Modal proveedores de un local (asignar existente + editar asignación) ──
// localFijo: el local desde el que se abrió el formulario (viene del sidebar).
// Ya NO crea proveedores nuevos ni edita nombre/empresa/telefono: esos datos
// viven en el nodo global y se gestionan desde ModalGestionProveedores (arriba).
// Acá solo se maneja la ASIGNACIÓN a este local puntual.
//
// Tiene 2 pestañas:
//  - "Asignar": elige un proveedor del nodo global que aún no esté asignado
//               a este local, y define sus días de visita.
//  - "Editar":  lista los proveedores YA asignados a este local (en vivo) y
//               permite editar solo días de visita y activar/desactivar.
//
// onGuardar (opcional): se sigue invocando después de asignar un proveedor,
// por compatibilidad con quien use este modal para refrescar su propio
// estado local; el guardado real en la BD ya ocurrió antes de llamarlo.
export function ModalNuevoProveedor({ visible, onClose, onGuardar, localFijo }) {
  const [tab, setTab] = useState('asignar'); // 'asignar' | 'editar'

  // ── Pestaña "Asignar" ──
  const [disponibles, setDisponibles]           = useState([]);
  const [cargandoDisponibles, setCargandoDisponibles] = useState(false);
  const [proveedorAsignarId, setProveedorAsignarId]   = useState(null);
  const [diasAsignar, setDiasAsignar]           = useState([]);
  const [erroresAsignar, setErroresAsignar]     = useState({});
  const [guardandoAsignar, setGuardandoAsignar] = useState(false);

  // ── Pestaña "Editar" ──
  const [listaProveedores, setListaProveedores] = useState([]);
  const [proveedorEditId, setProveedorEditId]   = useState(null);
  const [editForm, setEditForm]     = useState({ dias: [] });
  const [editErrors, setEditErrors] = useState({});
  const [editGuardando, setEditGuardando] = useState(false);

  // Se suscribe a los proveedores YA asignados a este local mientras el modal
  // esté abierto, así la lista de "Editar" siempre refleja lo que hay en la BD.
  useEffect(() => {
    if (!visible || !localFijo) return undefined;
    const cancelar = suscribirProveedoresPorLocal(localFijo, setListaProveedores);
    return cancelar;
  }, [visible, localFijo]);

  // Carga (una vez, al entrar a la pestaña "Asignar") los proveedores
  // globales que todavía no están asignados a este local.
  useEffect(() => {
    if (!visible || !localFijo || tab !== 'asignar' || proveedorAsignarId) return undefined;
    let cancelado = false;
    setCargandoDisponibles(true);
    obtenerProveedoresGlobalesDisponibles(localFijo)
      .then(lista => { if (!cancelado) setDisponibles(lista); })
      .finally(() => { if (!cancelado) setCargandoDisponibles(false); });
    return () => { cancelado = true; };
  }, [visible, localFijo, tab, proveedorAsignarId]);

  const proveedorSeleccionado = listaProveedores.find(p => p.id === proveedorEditId) ?? null;
  const proveedorParaAsignar  = disponibles.find(p => p.id === proveedorAsignarId) ?? null;

  function toggleDiaAsignar(idx) {
    setDiasAsignar(d => (d.includes(idx) ? d.filter(x => x !== idx) : [...d, idx]));
  }

  function toggleDiaEdicion(idx) {
    setEditForm(f => {
      const yaEstaba = f.dias.includes(idx);
      if (yaEstaba && f.dias.length === 1) {
        setEditErrors(prev => ({ ...prev, dias: 'Debe quedar al menos un día seleccionado' }));
        return f;
      }
      setEditErrors(prev => {
        const { dias, ...resto } = prev;
        return resto;
      });
      return { ...f, dias: yaEstaba ? f.dias.filter(d => d !== idx) : [...f.dias, idx] };
    });
  }

  function handleElegirParaAsignar(p) {
    setProveedorAsignarId(p.id);
    setDiasAsignar([]);
    setErroresAsignar({});
  }

  function handleVolverADisponibles() {
    setProveedorAsignarId(null);
    setDiasAsignar([]);
    setErroresAsignar({});
  }

  async function handleGuardarAsignacion(e) {
    e.preventDefault();
    if (!proveedorAsignarId) return;
    if (diasAsignar.length === 0) {
      setErroresAsignar({ dias: 'Selecciona al menos un día de visita' });
      return;
    }
    setErroresAsignar({});
    setGuardandoAsignar(true);
    try {
      await asignarProveedorExistenteALocal(localFijo, proveedorAsignarId, diasAsignar);
      onGuardar?.({ id: proveedorAsignarId, locales: [localFijo], dias: diasAsignar, activo: true });
      setDisponibles(prev => prev.filter(p => p.id !== proveedorAsignarId));
      handleVolverADisponibles();
      onClose();
    } catch (err) {
      setErroresAsignar(err?.errores ?? { general: 'No se pudo asignar el proveedor. Intenta nuevamente.' });
    } finally {
      setGuardandoAsignar(false);
    }
  }

  function handleSeleccionarProveedor(p) {
    setProveedorEditId(p.id);
    setEditForm({ dias: [...p.dias] });
    setEditErrors({});
  }

  function handleVolverALista() {
    setProveedorEditId(null);
    setEditForm({ dias: [] });
    setEditErrors({});
  }

  async function handleGuardarEdicion(e) {
    e.preventDefault();
    if (!proveedorEditId) return;
    setEditErrors({});
    setEditGuardando(true);
    try {
      await actualizarDiasProveedorLocal(localFijo, proveedorEditId, editForm.dias);
      handleVolverALista();
    } catch (err) {
      setEditErrors(err?.errores ?? { general: 'No se pudieron guardar los cambios. Intenta nuevamente.' });
    } finally {
      setEditGuardando(false);
    }
  }

  async function handleToggleActivo(p) {
    try {
      await cambiarEstadoProveedor(localFijo, p.id, !p.activo);
    } catch {
      // Silencioso: la suscripción en vivo corrige la UI si la escritura falla.
    }
  }

  function handleClose() {
    setTab('asignar');
    handleVolverADisponibles();
    handleVolverALista();
    onClose();
  }

  function handleCambiarTab(nuevoTab) {
    setTab(nuevoTab);
    handleVolverADisponibles();
    handleVolverALista();
  }

  if (!visible) return null;

  const col = LOCAL_COLORS[localFijo] || { bg: '#F8F9FA', text: '#7F8C8D' };

  return (
    <div className="inv-modal-overlay" onClick={handleClose}>
      <div className="inv-modal-sheet inv-modal-sheet-tall" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-handle" />
        <div className="inv-modal-row-between" style={{ marginBottom: 6 }}>
          <h2 className="inv-modal-title">{tab === 'asignar' ? 'Asignar proveedor' : 'Editar proveedor'}</h2>
          <button type="button" className="inv-modal-close" onClick={handleClose} aria-label="Cerrar">
            <FiX size={20} />
          </button>
        </div>

        <div className="inv-modal-row" style={{ marginBottom: 14, gap: 6 }}>
          <span className="inv-chip" style={{ backgroundColor: col.bg, color: col.text }}>
            {LOCAL_LABELS[localFijo] ?? localFijo}
          </span>
          <span className="inv-modal-hint-inline">Local asignado automáticamente</span>
        </div>

        {/* Selector de pestaña */}
        <div className="inv-modal-row" style={{ gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => handleCambiarTab('asignar')}
            className="inv-modal-btn"
            style={{
              flex: 1,
              backgroundColor: tab === 'asignar' ? 'var(--c-btnBg, #1B1B1B)' : 'transparent',
              color: tab === 'asignar' ? 'var(--c-btnText, #fff)' : 'var(--c-textSecondary, #7F8C8D)',
              border: '1px solid var(--c-border, #E4E2DD)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <FiUserPlus size={14} /> Asignar
          </button>
          <button
            type="button"
            onClick={() => handleCambiarTab('editar')}
            className="inv-modal-btn"
            style={{
              flex: 1,
              backgroundColor: tab === 'editar' ? 'var(--c-btnBg, #1B1B1B)' : 'transparent',
              color: tab === 'editar' ? 'var(--c-btnText, #fff)' : 'var(--c-textSecondary, #7F8C8D)',
              border: '1px solid var(--c-border, #E4E2DD)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <FiUsers size={14} /> Editar
          </button>
        </div>

        {/* ── Pestaña Asignar: elegir proveedor ── */}
        {tab === 'asignar' && !proveedorParaAsignar && (
          <div className="inv-modal-scroll">
            {cargandoDisponibles ? (
              <div className="inv-modal-recom-empty">
                <span>Cargando proveedores...</span>
              </div>
            ) : disponibles.length === 0 ? (
              <div className="inv-modal-recom-empty">
                <FiCheckCircle size={20} color="#639922" />
                <span>No hay proveedores disponibles para asignar. Créalos primero desde "Gestión de proveedores".</span>
              </div>
            ) : (
              <div className="inv-modal-recom-list">
                {disponibles.map(p => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleElegirParaAsignar(p)}
                    className="inv-modal-row-between"
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 12px',
                      border: '1px solid var(--c-border, #E4E2DD)', borderRadius: 10,
                      background: 'transparent', cursor: 'pointer', marginBottom: 8,
                    }}
                  >
                    <div className="inv-modal-row" style={{ gap: 10 }}>
                      <span className="inv-avatar-lg" style={{ width: 34, height: 34, fontSize: 13 }}>{getInitials(p.nombre)}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{p.nombre}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--c-textSecondary, #7F8C8D)' }}>{p.empresa}</p>
                      </div>
                    </div>
                    <FiChevronRight size={16} color="var(--c-textSecondary, #7F8C8D)" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Pestaña Asignar: días de visita del proveedor elegido ── */}
        {tab === 'asignar' && proveedorParaAsignar && (
          <form className="inv-modal-scroll" onSubmit={handleGuardarAsignacion}>
            <button
              type="button"
              onClick={handleVolverADisponibles}
              className="inv-modal-row"
              style={{ gap: 4, background: 'none', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', color: 'var(--c-textSecondary, #7F8C8D)' }}
            >
              <FiChevronLeft size={16} /> Elegir otro proveedor
            </button>

            {erroresAsignar.general && <p className="inv-modal-errortext" style={{ marginBottom: 10 }}>{erroresAsignar.general}</p>}

            <div className="inv-modal-row" style={{ gap: 10, marginBottom: 14 }}>
              <span className="inv-avatar-lg">{getInitials(proveedorParaAsignar.nombre)}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{proveedorParaAsignar.nombre}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--c-textSecondary, #7F8C8D)' }}>{proveedorParaAsignar.empresa}</p>
              </div>
            </div>

            <div className="inv-modal-formgroup">
              <label className="inv-modal-formlabel">
                Días de visita <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <div className="inv-modal-row" style={{ flexWrap: 'wrap', gap: 7 }}>
                {DIAS_SEMANA.map(({ idx, label }) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => toggleDiaAsignar(idx)}
                    className={`inv-modal-dia-toggle ${diasAsignar.includes(idx) ? 'inv-modal-dia-toggle-active' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {erroresAsignar.dias && <p className="inv-modal-errortext">{erroresAsignar.dias}</p>}
            </div>

            <div className="inv-modal-row" style={{ gap: 10, marginTop: 6, marginBottom: 8 }}>
              <button type="button" className="inv-modal-btn inv-modal-btn-secondary" onClick={handleClose}>
                Cancelar
              </button>
              <button type="submit" className="inv-modal-btn inv-modal-btn-primary" disabled={guardandoAsignar}>
                {guardandoAsignar ? 'Guardando...' : 'Asignar proveedor'}
              </button>
            </div>
          </form>
        )}

        {/* ── Pestaña Editar: lista ── */}
        {tab === 'editar' && !proveedorSeleccionado && (
          <div className="inv-modal-scroll">
            {listaProveedores.length === 0 ? (
              <div className="inv-modal-recom-empty">
                <FiCheckCircle size={20} color="#639922" />
                <span>Aún no hay proveedores asignados a {LOCAL_LABELS[localFijo] ?? localFijo}</span>
              </div>
            ) : (
              <div className="inv-modal-recom-list">
                {listaProveedores.map(p => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleSeleccionarProveedor(p)}
                    className="inv-modal-row-between"
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 12px',
                      border: '1px solid var(--c-border, #E4E2DD)', borderRadius: 10,
                      background: 'transparent', cursor: 'pointer', marginBottom: 8,
                    }}
                  >
                    <div className="inv-modal-row" style={{ gap: 10 }}>
                      <span className="inv-avatar-lg" style={{ width: 34, height: 34, fontSize: 13 }}>{p.initials}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{p.nombre}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--c-textSecondary, #7F8C8D)' }}>{p.empresa}</p>
                      </div>
                    </div>
                    <div className="inv-modal-row" style={{ gap: 8 }}>
                      <Badge label={p.activo ? 'Activo' : 'Inactivo'} level={p.activo ? 'ok' : 'info'} />
                      <FiChevronRight size={16} color="var(--c-textSecondary, #7F8C8D)" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Pestaña Editar: formulario del proveedor seleccionado ── */}
        {tab === 'editar' && proveedorSeleccionado && (
          <form className="inv-modal-scroll" onSubmit={handleGuardarEdicion}>
            <button
              type="button"
              onClick={handleVolverALista}
              className="inv-modal-row"
              style={{ gap: 4, background: 'none', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', color: 'var(--c-textSecondary, #7F8C8D)' }}
            >
              <FiChevronLeft size={16} /> Volver a la lista
            </button>

            {editErrors.general && <p className="inv-modal-errortext" style={{ marginBottom: 10 }}>{editErrors.general}</p>}

            <div className="inv-modal-row" style={{ gap: 10, marginBottom: 14 }}>
              <span className="inv-avatar-lg">{proveedorSeleccionado.initials}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{proveedorSeleccionado.nombre}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--c-textSecondary, #7F8C8D)' }}>
                  {proveedorSeleccionado.empresa} · {proveedorSeleccionado.telefono}
                </p>
              </div>
            </div>

            <div className="inv-modal-formgroup">
              <label className="inv-modal-formlabel">
                Días de visita <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <div className="inv-modal-row" style={{ flexWrap: 'wrap', gap: 7 }}>
                {DIAS_SEMANA.map(({ idx, label }) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => toggleDiaEdicion(idx)}
                    className={`inv-modal-dia-toggle ${editForm.dias.includes(idx) ? 'inv-modal-dia-toggle-active' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {editErrors.dias && <p className="inv-modal-errortext">{editErrors.dias}</p>}
            </div>

            <div className="inv-modal-row-between" style={{ marginTop: 4, marginBottom: 14, padding: '10px 12px', border: '1px solid var(--c-border, #E4E2DD)', borderRadius: 10 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>
                  {proveedorSeleccionado.activo ? 'Proveedor activo' : 'Proveedor inactivo'}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--c-textSecondary, #7F8C8D)' }}>
                  {proveedorSeleccionado.activo ? 'Visible en agenda y listados' : 'Oculto de agenda y listados'}
                </p>
              </div>
              <ToggleSwitch value={proveedorSeleccionado.activo} onToggle={() => handleToggleActivo(proveedorSeleccionado)} />
            </div>

            <div className="inv-modal-row" style={{ gap: 10, marginTop: 6, marginBottom: 8 }}>
              <button type="button" className="inv-modal-btn inv-modal-btn-secondary" onClick={handleVolverALista}>
                Cancelar
              </button>
              <button type="submit" className="inv-modal-btn inv-modal-btn-primary" disabled={editGuardando}>
                {editGuardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}