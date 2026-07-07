import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  FiSearch, FiX, FiPlus, FiSun, FiMoon, FiCircle, FiLock, FiCalendar,
  FiCheckCircle, FiAlertTriangle, FiClipboard, FiUser, FiList, FiGrid, FiPackage,
} from 'react-icons/fi';
import { FaCrown, FaReceipt, FaMotorcycle, FaHamburger, FaCoffee, FaUsers } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import {
  suscribirPersonal,
  crearEmpleado,
  actualizarEmpleado,
  toggleActivoEmpleado,
  suscribirHistorialEmpleado,
  verificarDuplicadosEmpleado,
} from '../control/EmpleadoControl';
import { obtenerHorarioLocal } from '../control/LocalControl'; // TODO: ajustar la ruta según donde guardes LocalControl.jsx
import { useAuth, estaRealmenteEnLinea  } from '../control/AuthContext';
import '../css/PersonalScreen.css';

// ─── Breakpoint ───────────────────────────────────────────────────────────────
const DESKTOP_BREAKPOINT = 768;

// ─── Constantes ───────────────────────────────────────────────────────────────
const LOCAL_LABELS = { comidaRapida: 'ComidaRápida', almacen: 'Almacén', cafeteria: 'Cafetería' };
const LOCAL_EMOJI  = { comidaRapida: '🍔', almacen: '📦', cafeteria: '☕' }; // kept for legacy data refs
const LOCAL_COLORS = {
  comidaRapida: { bg: '#E6F1FB', text: '#0C447C' },
  almacen:      { bg: '#EAF3DE', text: '#27500A' },
  cafeteria:    { bg: '#FAEEDA', text: '#633806' },
};
const LOCALES_LIST = ['comidaRapida', 'almacen', 'cafeteria'];

const ROLES = {
  administrador: { label: 'Administrador', icon: 'crown',   bg: '#EAF3DE', text: '#27500A' },
  cajero:        { label: 'Cajero',         icon: 'receipt', bg: '#E6F1FB', text: '#0C447C' },
  repartidor:    { label: 'Repartidor',     icon: 'moped',   bg: '#FAEEDA', text: '#633806' },
};

// Las horas de cada turno ya NO se hardcodean acá: se leen en vivo desde
// LocalControl (turnoDia / turnoNoche de cada local). Esto solo guarda la
// etiqueta e ícono genéricos de cada tipo de turno.
const TURNOS = {
  dia:   { label: 'Diurno',   icon: 'sun' },
  noche: { label: 'Nocturno', icon: 'moon' },
};

/**
 * Convierte el objeto `localAsignado` ({ cafeteria: true, almacen: false, ... })
 * en la lista de nombres de locales que están en `true`.
 * @param {object} localAsignado
 * @returns {string[]}
 */
function localesAsignados(localAsignado) {
  if (!localAsignado || typeof localAsignado !== 'object') return [];
  return Object.entries(localAsignado)
    .filter(([, asignado]) => asignado === true)
    .map(([nombre]) => nombre);
}

/**
 * Construye un objeto `localAsignado` completo (con las 3 keys de
 * LOCALES_LIST) a partir de la lista de locales que deben quedar en `true`.
 * @param {string[]} localesSeleccionados
 * @returns {object}
 */
function construirLocalAsignado(localesSeleccionados) {
  const obj = {};
  LOCALES_LIST.forEach(loc => { obj[loc] = localesSeleccionados.includes(loc); });
  return obj;
}

/**
 * Devuelve los locales de un empleado ya en formato array, con fallback al
 * viejo campo singular `local` para datos legados que no tengan `localAsignado`.
 * @param {object} emp
 * @returns {string[]}
 */
function localesDeEmpleado(emp) {
  const asignados = localesAsignados(emp?.localAsignado);
  return asignados.length > 0 ? asignados : (emp?.local ? [emp.local] : []);
}

/**
 * Busca, dentro del mapa de horarios ya cargados (uno por local), el rango
 * hora_inicio–hora_fin correspondiente al turno de un empleado según su
 * primer local asignado.
 * @param {Record<string, import('../models/LocalModel').LocalModel>} horariosLocales
 * @param {object} localAsignado - locales asignados al empleado (se usa el primero en true)
 * @param {'dia'|'noche'} turno
 * @returns {{hora_inicio: string, hora_fin: string}|null}
 */
function obtenerRangoTurno(horariosLocales, localAsignado, turno) {
  if (!turno) return null; // administrador no tiene turno asignado
  const nombreLocal = localesAsignados(localAsignado)[0];
  const horarioLocal = horariosLocales?.[nombreLocal];
  if (!horarioLocal) return null;
  const turnoModel = horarioLocal.getTurno(turno === 'noche' ? 'turnoNoche' : 'turnoDia');
  return turnoModel ? { hora_inicio: turnoModel.hora_inicio, hora_fin: turnoModel.hora_fin } : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(nombre) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Santiago' })
    + ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' });
}

function estaEnLinea(ultimaConexion) {
  if (!ultimaConexion) return false;
  return (Date.now() - new Date(ultimaConexion).getTime()) < 15 * 60 * 1000;
}

function validarNombre(nombre) {
  // Solo letras (incluyendo tildes y ñ), espacios y guiones
  return /^[A-Za-záéíóúÁÉÍÓÚäëïöüÄËÏÖÜñÑ\s\-']+$/.test(nombre.trim()) && nombre.trim().length > 0;
}

function validarRut(rut) {
  // Debe tener formato 7-8 dígitos, guión y dígito verificador (número o K)
  if (!/^\d{7,8}-[\dkK]$/.test(rut)) return false;

  // Validar dígito verificador
  const [cuerpo, dvIngresado] = rut.split('-');
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado =
    dvEsperado === 11 ? '0' :
    dvEsperado === 10 ? 'k' :
    String(dvEsperado);

  return dvIngresado.toLowerCase() === dvCalculado;
}

function validarTelefono(tel) {
  // Solo dígitos, exactamente 9, debe empezar con 9 — no se permiten letras
  return /^9\d{8}$/.test(tel.trim());
}

function validarEmail(email) {
  // Debe tener @, punto y un dominio válido (ej: usuario@dominio.com)
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

// ─── Icon helpers (react-icons en vez de @expo/vector-icons) ─────────────────
function RolIcon({ rol, size = 12, color }) {
  if (rol === 'administrador') return <FaCrown size={size} color={color ?? '#27500A'} />;
  if (rol === 'repartidor')    return <FaMotorcycle size={size} color={color ?? '#633806'} />;
  return <FaReceipt size={size} color={color ?? '#0C447C'} />;
}

function TurnoIcon({ turno, size = 12, color = '#7F8C8D' }) {
  if (!turno) return null; // administrador no tiene turno asignado
  if (turno === 'noche') return <FiMoon size={size} color={color} />;
  return <FiSun size={size} color={color} />;
}

function LocalIcon({ loc, size = 12, color }) {
  if (loc === 'comidaRapida') return <FaHamburger size={size} color={color ?? '#0C447C'} />;
  if (loc === 'almacen')   return <FiPackage size={size} color={color ?? '#27500A'} />;
  if (loc === 'cafeteria') return <FaCoffee size={size} color={color ?? '#633806'} />;
  return null;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, level }) {
  const map = {
    critical: { bg: '#FCEBEB', text: '#791F1F' },
    low:      { bg: '#FAEEDA', text: '#633806' },
    ok:       { bg: '#EAF3DE', text: '#27500A' },
    info:     { bg: '#E6F1FB', text: '#0C447C' },
    neutral:  { bg: '#F0F3F4', text: '#7F8C8D' },
  };
  const col = map[level] || map.neutral;
  return (
    <span className="ps-badge" style={{ backgroundColor: col.bg }}>
      <span className="ps-badge-text" style={{ color: col.text }}>{label}</span>
    </span>
  );
}

// ─── Spinner (equivalente a ActivityIndicator) ───────────────────────────────
function Spinner({ size = 20, color = '#2C3E50' }) {
  return (
    <span
      className="ps-spinner"
      style={{ width: size, height: size, borderColor: `${color}33`, borderTopColor: color }}
    />
  );
}

// ─── Toggle (equivalente a Switch) ────────────────────────────────────────────
function ToggleSwitch({ value, onChange, activeColor = '#639922' }) {
  return (
    <label className="ps-switch">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
      <span className="ps-switch-track" style={{ backgroundColor: value ? activeColor : '#E2E6EA' }}>
        <span className="ps-switch-thumb" />
      </span>
    </label>
  );
}

// ─── Hook: ancho de ventana (equivalente a useWindowDimensions) ──────────────
function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    function onResize() { setWidth(window.innerWidth); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

// ─── Componente Historial en tiempo real ─────────────────────────────────────
// Lee desde el nodo externo historialPersonal (filtrado por empleadoId),
// ya no desde usuarios/{empleadoId}/historial.
function HistorialTab({ empleadoId, colors }) {
  const [historial, setHistorial] = useState([]);
  const [cargando,  setCargando]  = useState(true);

  useEffect(() => {
    if (!empleadoId) return;

    setCargando(true);

    const cancelar = suscribirHistorialEmpleado(empleadoId, (items) => {
      const ordenado = [...items].sort((a, b) =>
        (b.entrada ?? '').localeCompare(a.entrada ?? '')
      );
      setHistorial(ordenado);
      setCargando(false);
    });

    return () => cancelar();
  }, [empleadoId]);

  if (cargando) return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Spinner size={18} color="#2C3E50" />
      <span style={{ marginTop: 8, color: colors.textSecondary, fontSize: 12 }}>Cargando historial…</span>
    </div>
  );

  return (
    <div>
      <p className="ps-section-label" style={{ color: colors.textSecondary, marginBottom: 10 }}>
        ÚLTIMAS SESIONES · {historial.length}
      </p>
      {historial.length === 0 ? (
        <div className="ps-empty-box" style={{ borderColor: colors.border }}>
          <FiClipboard size={22} color="#BDC3C7" style={{ marginBottom: 6 }} />
          <p className="ps-empty-text" style={{ color: colors.textSecondary }}>Sin historial registrado</p>
        </div>
      ) : (
        <div className="ps-info-table" style={{ borderColor: colors.border }}>
          <div className="ps-info-row" style={{ backgroundColor: '#F8F9FA', borderBottom: `0.5px solid ${colors.border}` }}>
            {['Entrada', 'Salida', 'Turno'].map(h => (
              <span key={h} className="ps-info-key" style={{ color: colors.textSecondary, fontWeight: 700, flex: 1 }}>{h}</span>
            ))}
          </div>
          {historial.map((h, i, arr) => (
            <div key={h.id} className="ps-info-row" style={{ borderBottom: i < arr.length - 1 ? `0.5px solid ${colors.border}` : 'none' }}>
              <span style={{ flex: 1, fontSize: 12, color: '#27500A', fontWeight: 600 }}>{h.entrada}</span>
              <span style={{ flex: 1, fontSize: 12, color: h.salida ? colors.textPrimary : '#BA7517' }}>
                {h.salida ?? '⏳ En turno'}
              </span>
              <div style={{ flex: 1 }}>
                <Badge
                  label={TURNOS[h.turno]?.label ?? h.turno}
                  level={h.turno === 'noche' ? 'info' : 'ok'}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal: Detalle / Editar empleado ────────────────────────────────────────
function ModalEmpleado({ empleado, visible, onClose, onGuardar, onDesactivar, esNuevo, esAdmin, verificarDuplicados, horariosLocales }) {
  const { colors } = useTheme();

  const EMPTY = {
    nombre: '', rut: '', rol: 'cajero', localAsignado: construirLocalAsignado(['comidaRapida']), turno: 'dia',
    telefono: '', email: '', fechaIngreso: new Date().toISOString().split('T')[0],
    activo: true, restriccionHorario: true, ultimaConexion: null,
  };

  const [form,     setForm]     = useState(esNuevo ? EMPTY : {
    ...EMPTY,       // garantiza que ningún campo sea undefined
    ...empleado,    // sobreescribe con los datos reales del empleado
  });
  const [errors,   setErrors]   = useState({});
  const [guardado, setGuardado] = useState(false);
  const [tab,      setTab]      = useState('datos'); // 'datos' | 'acceso' | 'historial'

  // Resetear form al abrir
  useEffect(() => {
    if (visible) {
      setForm(esNuevo ? EMPTY : {
        ...EMPTY,     // garantiza que ningún campo sea undefined
        ...empleado,  // sobreescribe con los datos reales del empleado
      });
      setErrors({});
      setGuardado(false);
      setTab('datos');
    }
  }, [visible, esNuevo, empleado?.id]);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  // El administrador no tiene turno (login sin restricción horaria por turno):
  // si cambia a "administrador" se limpia el turno a null, y si cambia de
  // administrador a cajero/repartidor y no tiene turno, se le asigna uno por defecto.
  useEffect(() => {
    if (form.rol === 'administrador') {
      if (form.turno !== null) set('turno', null);
    } else if (!form.turno) {
      set('turno', 'dia');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.rol]);

  async function handleGuardar() {
    const e = {};

    if (esNuevo) {
      // Validaciones completas solo al crear
      if (!form.nombre.trim()) {
        e.nombre = 'El nombre es requerido';
      } else if (!validarNombre(form.nombre)) {
        e.nombre = 'El nombre no debe contener números ni caracteres especiales';
      }
      if (!form.rut.trim()) {
        e.rut = 'El RUT es requerido';
      } else if (!validarRut(form.rut)) {
        e.rut = 'RUT inválido. Usa el formato 12345678-9 con dígito verificador correcto';
      }
      if (!form.email.trim()) {
        e.email = 'El email es requerido';
      } else if (!validarEmail(form.email)) {
        e.email = 'Ingresa un email válido con @ y dominio (ej: nombre@empresa.cl)';
      }
      if (!form.telefono.trim()) {
        e.telefono = 'El teléfono es requerido';
      } else if (!validarTelefono(form.telefono)) {
        e.telefono = 'Debe comenzar con 9 y tener exactamente 9 dígitos (sin letras)';
      }
      if ((form.rol === 'cajero' || form.rol === 'repartidor') && !localesAsignados(form.localAsignado).length) {
        e.locales = form.rol === 'cajero' ? 'El cajero debe tener un local' : 'El repartidor debe tener un local';
      }

      // Verificar duplicados en BD solo si el formato de rut y email es válido
      if (!e.rut && !e.email && verificarDuplicados) {
        const dupes = await verificarDuplicados(form.rut, form.email);
        if (dupes.rut)   e.rut   = 'Un empleado ya cuenta con este RUT';
        if (dupes.email) e.email = 'Un empleado ya cuenta con este email';
      }
    } else {
      // Al editar solo validar locales si es cajero o repartidor
      if ((form.rol === 'cajero' || form.rol === 'repartidor') && !localesAsignados(form.localAsignado).length) {
        e.locales = form.rol === 'cajero' ? 'El cajero debe tener un local' : 'El repartidor debe tener un local';
      }
    }

    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const nuevo = { ...form, id: esNuevo ? null : form.id, localAsignado: form.localAsignado ?? {} };
    const passwordTemporal = esNuevo
      ? Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!'
      : null;
    const ok = await onGuardar(nuevo, passwordTemporal);
    if (ok) {
      if (esNuevo) {
        onClose();
      } else {
        // Mostrar confirmación y cerrar tras 1.5 s
        setGuardado(true);
        setTimeout(() => { setGuardado(false); onClose(); }, 1500);
      }
    }
  }

  if (!visible) return null;

  const rangoTurnoActual = obtenerRangoTurno(horariosLocales, form.localAsignado, form.turno);
  const rangoTurnoEmpleado = obtenerRangoTurno(horariosLocales, empleado?.localAsignado, empleado?.turno);
  const TABS_MODAL = [
    { id: 'datos',    label: 'Datos' },
    ...(esAdmin && !esNuevo ? [{ id: 'acceso', label: 'Acceso' }] : []),
    ...(!esNuevo ? [{ id: 'historial', label: 'Historial' }] : []),
  ];

  return (
    <div className="ps-sheet-overlay" onClick={onClose}>
      <div className="ps-sheet" style={{ backgroundColor: colors.surface }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="ps-handle" />

        {/* Header */}
        <div className="ps-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <p className="ps-modal-title" style={{ color: colors.textPrimary }}>
            {esNuevo ? '+ Nuevo empleado' : form.nombre}
          </p>
          <button className="ps-close-btn ps-reset-btn" onClick={onClose} type="button">
            <FiX size={20} color="#7F8C8D" />
          </button>
        </div>

        {/* Tabs internos */}
        <div className="ps-tab-bar" style={{ borderBottomColor: colors.border, marginBottom: 14 }}>
          {TABS_MODAL.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`ps-tab ${tab === t.id ? 'ps-tab-active' : ''}`}>
              <span className="ps-tab-text" style={{ color: tab === t.id ? colors.textPrimary : colors.textSecondary, fontWeight: tab === t.id ? 600 : 400 }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        <div className="ps-scroll" style={{ flex: 1, minHeight: 0 }}>

          {/* ── TAB DATOS ── */}
          {tab === 'datos' && (
            <div>

              {esNuevo ? (
                /* ── FORMULARIO (solo al crear) ── */
                <>
                  {/* Nombre */}
                  <div className="ps-form-group">
                    <label className="ps-form-label" style={{ color: colors.textPrimary }}>Nombre completo <span style={{ color: '#E24B4A' }}>*</span></label>
                    <input
                      className={`ps-input ${errors.nombre ? 'ps-input-error' : ''}`}
                      placeholder="Ej: María González"
                      value={form.nombre}
                      onChange={e => set('nombre', e.target.value)}
                    />
                    {errors.nombre && <p className="ps-error-text">{errors.nombre}</p>}
                  </div>

                  {/* RUT */}
                  <div className="ps-form-group">
                    <label className="ps-form-label" style={{ color: colors.textPrimary }}>RUT <span style={{ color: '#E24B4A' }}>*</span></label>
                    <input
                      className={`ps-input ${errors.rut ? 'ps-input-error' : ''}`}
                      placeholder="12345678-9"
                      value={form.rut}
                      onChange={e => set('rut', e.target.value)}
                    />
                    {errors.rut && <p className="ps-error-text">{errors.rut}</p>}
                  </div>

                  {/* Teléfono + Email */}
                  <div className="ps-row" style={{ gap: 10, alignItems: 'flex-start' }}>
                    <div className="ps-form-group" style={{ flex: 1 }}>
                      <label className="ps-form-label" style={{ color: colors.textPrimary }}>Teléfono <span style={{ color: '#E24B4A' }}>*</span></label>
                      <input
                        className={`ps-input ${errors.telefono ? 'ps-input-error' : ''}`}
                        placeholder="9 1234 5678"
                        value={form.telefono}
                        onChange={e => set('telefono', e.target.value)}
                        type="tel"
                      />
                      {errors.telefono && <p className="ps-error-text">{errors.telefono}</p>}
                    </div>
                    <div className="ps-form-group" style={{ flex: 1 }}>
                      <label className="ps-form-label" style={{ color: colors.textPrimary }}>Email <span style={{ color: '#E24B4A' }}>*</span></label>
                      <input
                        className={`ps-input ${errors.email ? 'ps-input-error' : ''}`}
                        placeholder="correo@empresa.cl"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        type="email"
                        autoCapitalize="none"
                      />
                      {errors.email && <p className="ps-error-text">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Fecha ingreso — autocompleta con hoy */}
                  <div className="ps-form-group ps-row" style={{ gap: 8, backgroundColor: '#EAF3DE', borderRadius: 9, padding: 10 }}>
                    <FiCalendar size={14} color="#27500A" />
                    <span style={{ fontSize: 13, color: '#27500A' }}>Fecha de ingreso: <span style={{ fontWeight: 700 }}>{form.fechaIngreso}</span></span>
                  </div>

                  {/* Rol */}
                  <div className="ps-form-group">
                    <label className="ps-form-label" style={{ color: colors.textPrimary }}>Rol <span style={{ color: '#E24B4A' }}>*</span></label>
                    <div className="ps-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      {Object.entries(ROLES).map(([key, r]) => (
                        <button key={key} type="button" onClick={() => set('rol', key)}
                          className="ps-toggle-btn"
                          style={form.rol === key
                            ? { backgroundColor: r.bg, borderColor: r.text }
                            : { borderColor: '#E2E6EA', backgroundColor: '#FAFBFC' }
                          }>
                          <RolIcon rol={key} size={14} color={form.rol === key ? r.text : '#7F8C8D'} />
                          <span className="ps-toggle-btn-text" style={{ color: form.rol === key ? r.text : '#7F8C8D', fontWeight: form.rol === key ? 600 : 400 }}>
                            {r.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Locales */}
                  {(form.rol === 'cajero' || form.rol === 'repartidor' || form.rol === 'administrador') && (
                    <div className="ps-form-group">
                      <label className="ps-form-label" style={{ color: colors.textPrimary }}>
                        {(form.rol === 'cajero' || form.rol === 'repartidor') ? 'Local asignado' : 'Locales asignados'}{' '}
                        <span style={{ color: '#E24B4A' }}>*</span>
                      </label>
                      <div className="ps-row" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        {LOCALES_LIST.map(loc => {
                          const col = LOCAL_COLORS[loc];
                          const sel = !!form.localAsignado?.[loc];
                          return (
                            <button key={loc} type="button"
                              onClick={() => {
                                if (form.rol === 'cajero' || form.rol === 'repartidor') {
                                  set('localAsignado', construirLocalAsignado([loc]));
                                } else {
                                  const actuales = localesAsignados(form.localAsignado);
                                  const nuevos = sel ? actuales.filter(l => l !== loc) : [...actuales, loc];
                                  set('localAsignado', construirLocalAsignado(nuevos));
                                }
                              }}
                              className="ps-toggle-btn"
                              style={sel ? { backgroundColor: col.bg, borderColor: col.text }
                                          : { borderColor: '#E2E6EA', backgroundColor: '#FAFBFC' }}>
                              <LocalIcon loc={loc} size={13} color={sel ? col.text : '#7F8C8D'} />
                              <span className="ps-toggle-btn-text" style={{ color: sel ? col.text : '#7F8C8D', fontWeight: sel ? 600 : 400 }}>
                                {LOCAL_LABELS[loc]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {errors.locales && <p className="ps-error-text">{errors.locales}</p>}
                    </div>
                  )}

                  {/* Turno — solo aplica a cajero/repartidor; administrador queda sin turno (null) */}
                  {(form.rol === 'cajero' || form.rol === 'repartidor') && (
                    <div className="ps-form-group">
                      <label className="ps-form-label" style={{ color: colors.textPrimary }}>Turno</label>
                      <div className="ps-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        {Object.entries(TURNOS).map(([key, t]) => {
                          const rango = obtenerRangoTurno(horariosLocales, form.localAsignado, key);
                          return (
                            <button key={key} type="button" onClick={() => set('turno', key)}
                              className="ps-toggle-btn"
                              style={form.turno === key
                                ? { backgroundColor: '#2C3E50', borderColor: '#2C3E50' }
                                : { borderColor: '#E2E6EA', backgroundColor: '#FAFBFC' }
                              }>
                              <TurnoIcon turno={key} size={13} color={form.turno === key ? '#FFFFFF' : '#7F8C8D'} />
                              <span className="ps-toggle-btn-text" style={{ color: form.turno === key ? '#FFFFFF' : '#7F8C8D', fontWeight: form.turno === key ? 600 : 400 }}>
                                {t.label}{rango ? ` · ${rango.hora_inicio}–${rango.hora_fin}` : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {!localesAsignados(form.localAsignado).length && (
                        <p className="ps-error-text" style={{ color: '#7F8C8D' }}>
                          Selecciona un local para ver el horario de cada turno.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* ── SOLO LECTURA (al ver empleado existente) ── */
                <>
                  {/* Avatar + nombre */}
                  <div className="ps-col" style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 16, gap: 8 }}>
                    {(() => {
                      const r = ROLES[empleado?.rol] ?? { bg: '#F0F3F4', text: '#7F8C8D' };
                      return (
                        <div className="ps-avatar-sm" style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: r.bg }}>
                          <span className="ps-avatar-sm-text" style={{ color: r.text, fontSize: 20 }}>{getInitials(empleado?.nombre ?? '')}</span>
                        </div>
                      );
                    })()}
                    <p style={{ fontSize: 17, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>{empleado?.nombre}</p>
                    <span className="ps-mini-chip ps-row" style={{ backgroundColor: ROLES[empleado?.rol]?.bg ?? '#F0F3F4', gap: 4 }}>
                      <RolIcon rol={empleado?.rol} size={11} color={ROLES[empleado?.rol]?.text ?? '#7F8C8D'} />
                      <span className="ps-mini-chip-text" style={{ color: ROLES[empleado?.rol]?.text ?? '#7F8C8D' }}>
                        {ROLES[empleado?.rol]?.label ?? empleado?.rol}
                      </span>
                    </span>
                  </div>

                  {/* Tabla de datos */}
                  <div className="ps-info-table" style={{ borderColor: colors.border }}>
                    {[
                      { key: 'RUT',            val: empleado?.rut },
                      { key: 'Email',          val: empleado?.email },
                      { key: 'Teléfono',       val: empleado?.telefono },
                      { key: 'Fecha ingreso',  val: formatFecha(empleado?.fechaIngreso) },
                      // El administrador no tiene turno asignado (queda null)
                      ...(empleado?.rol !== 'administrador'
                        ? [{ key: 'Turno', val: TURNOS[empleado?.turno]?.label ?? empleado?.turno }]
                        : []),
                    ].map((r, i, arr) => (
                      <div key={r.key} className="ps-info-row" style={{ borderBottom: i < arr.length - 1 ? `0.5px solid ${colors.border}` : 'none' }}>
                        <span className="ps-info-key" style={{ color: colors.textSecondary }}>{r.key}</span>
                        {r.key === 'Turno' ? (
                          <div className="ps-row" style={{ gap: 5 }}>
                            <TurnoIcon turno={empleado?.turno} size={12} color={colors.textPrimary} />
                            <span className="ps-info-val" style={{ color: colors.textPrimary }}>
                              {r.val ?? '—'}
                              {rangoTurnoEmpleado ? ` · ${rangoTurnoEmpleado.hora_inicio}–${rangoTurnoEmpleado.hora_fin}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="ps-info-val" style={{ color: colors.textPrimary }}>{r.val ?? '—'}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Locales */}
                  {localesAsignados(empleado?.localAsignado).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p className="ps-section-label" style={{ color: colors.textSecondary, marginBottom: 8 }}>LOCALES ASIGNADOS</p>
                      <div className="ps-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        {localesAsignados(empleado?.localAsignado).map(loc => {
                          const col = LOCAL_COLORS[loc];
                          return (
                            <span key={loc} className="ps-mini-chip ps-row" style={{ backgroundColor: col?.bg, gap: 4 }}>
                              <LocalIcon loc={loc} size={11} color={col?.text} />
                              <span className="ps-mini-chip-text" style={{ color: col?.text }}>{LOCAL_LABELS[loc]}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {/* ── TAB ACCESO — solo visible para rol admin ── */}
          {tab === 'acceso' && esAdmin && (
            <div>

              {/* ── Actividad rápida ── */}
              {!esNuevo && (
                <>
                  <p className="ps-section-label" style={{ color: colors.textSecondary, marginBottom: 8 }}>ACTIVIDAD</p>
                  <div className="ps-info-table" style={{ borderColor: colors.border, marginBottom: 16 }}>
                    {[
                      { key: 'Hora ultimo inicio sesión', val: formatFechaHora(empleado.ultimaConexion), isStatus: false },
                      { key: 'Estado sesión', val: estaRealmenteEnLinea(empleado) ? 'En línea' : 'Desconectado', isStatus: true, online: estaRealmenteEnLinea(empleado) },
                      { key: 'Fecha ingreso',   val: formatFecha(empleado.fechaIngreso), isStatus: false },
                    ].map((r, i, arr) => (
                      <div key={r.key} className="ps-info-row" style={{ borderBottom: i < arr.length - 1 ? `0.5px solid ${colors.border}` : 'none' }}>
                        <span className="ps-info-key" style={{ color: colors.textSecondary }}>{r.key}</span>
                        {r.isStatus ? (
                          <div className="ps-row" style={{ gap: 5 }}>
                            <FiCircle size={8} color={r.online ? '#639922' : '#BDC3C7'} />
                            <span className="ps-info-val" style={{ color: r.online ? '#639922' : colors.textPrimary }}>{r.val}</span>
                          </div>
                        ) : (
                          <span className="ps-info-val" style={{ color: colors.textPrimary }}>{r.val}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Cuenta activa ── */}
              <p className="ps-section-label" style={{ color: colors.textSecondary, marginBottom: 8 }}>CAMBIOS RÁPIDOS</p>
              <div className="ps-switch-row" style={{ borderColor: colors.border }}>
                <div style={{ flex: 1 }}>
                  <p className="ps-switch-label" style={{ color: colors.textPrimary, margin: 0 }}>Cuenta activa</p>
                  <p className="ps-switch-sub" style={{ color: colors.textSecondary, margin: 0 }}>
                    El empleado puede iniciar sesión en la plataforma
                  </p>
                </div>
                <ToggleSwitch value={form.activo} onChange={v => set('activo', v)} activeColor="#639922" />
              </div>

              {/* ── Restricción horario ── */}
              <div className="ps-switch-row" style={{ borderColor: colors.border }}>
                <div style={{ flex: 1 }}>
                  <p className="ps-switch-label" style={{ color: colors.textPrimary, margin: 0 }}>Restringir acceso por horario</p>
                  <p className="ps-switch-sub" style={{ color: colors.textSecondary, margin: 0 }}>
                    Solo permite login durante el turno ({rangoTurnoActual ? `${rangoTurnoActual.hora_inicio}–${rangoTurnoActual.hora_fin}` : (form.rol === 'administrador' ? 'sin turno asignado' : 'sin local asignado')})
                  </p>
                </div>
                <ToggleSwitch value={form.restriccionHorario} onChange={v => set('restriccionHorario', v)} activeColor="#378ADD" />
              </div>

              {/* ── Turno — solo aplica a cajero/repartidor; administrador no tiene turno ── */}
              {(form.rol === 'cajero' || form.rol === 'repartidor') ? (
                <div className="ps-switch-row ps-col" style={{ borderColor: colors.border, alignItems: 'flex-start', gap: 10 }}>
                  <p className="ps-switch-label" style={{ color: colors.textPrimary, margin: 0 }}>Turno</p>
                  <div className="ps-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(TURNOS).map(([key, t]) => {
                      const rango = obtenerRangoTurno(horariosLocales, form.localAsignado, key);
                      return (
                        <button key={key} type="button" onClick={() => set('turno', key)}
                          className="ps-toggle-btn"
                          style={form.turno === key
                            ? { backgroundColor: '#2C3E50', borderColor: '#2C3E50' }
                            : { borderColor: '#E2E6EA', backgroundColor: '#FAFBFC' }
                          }>
                          <TurnoIcon turno={key} size={13} color={form.turno === key ? '#FFFFFF' : '#7F8C8D'} />
                          <span className="ps-toggle-btn-text" style={{ color: form.turno === key ? '#FFFFFF' : '#7F8C8D', fontWeight: form.turno === key ? 600 : 400 }}>
                            {t.label}{rango ? ` · ${rango.hora_inicio}–${rango.hora_fin}` : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="ps-switch-row" style={{ borderColor: colors.border }}>
                  <div style={{ flex: 1 }}>
                    <p className="ps-switch-label" style={{ color: colors.textPrimary, margin: 0 }}>Turno</p>
                    <p className="ps-switch-sub" style={{ color: colors.textSecondary, margin: 0 }}>
                      Los administradores no tienen turno asignado
                    </p>
                  </div>
                </div>
              )}

              {/* ── Locales ── */}
              <div className="ps-switch-row ps-col" style={{ borderColor: colors.border, alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <p className="ps-switch-label" style={{ color: colors.textPrimary, margin: 0 }}>Locales asignados</p>
                  <p className="ps-switch-sub" style={{ color: colors.textSecondary, margin: 0 }}>
                    {form.rol === 'cajero' ? 'El cajero gestiona un local'
                      : form.rol === 'repartidor' ? 'El repartidor gestiona un local'
                      : 'El administrador puede gestionar varios'}
                  </p>
                </div>
                <div className="ps-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {LOCALES_LIST.map(loc => {
                    const col = LOCAL_COLORS[loc];
                    const sel = !!form.localAsignado?.[loc];
                    function toggleLocal() {
                      if (form.rol === 'cajero' || form.rol === 'repartidor') {
                        set('localAsignado', construirLocalAsignado([loc]));
                      } else {
                        const actuales = localesAsignados(form.localAsignado);
                        const nuevos = sel ? actuales.filter(l => l !== loc) : [...actuales, loc];
                        set('localAsignado', construirLocalAsignado(nuevos));
                      }
                    }
                    return (
                      <button key={loc} type="button" onClick={toggleLocal}
                        className="ps-toggle-btn"
                        style={sel ? { backgroundColor: col.bg, borderColor: col.text }
                                    : { borderColor: '#E2E6EA', backgroundColor: '#FAFBFC' }}>
                        <LocalIcon loc={loc} size={13} color={sel ? col.text : '#7F8C8D'} />
                        <span className="ps-toggle-btn-text" style={{ color: sel ? col.text : '#7F8C8D', fontWeight: sel ? 600 : 400 }}>
                          {LOCAL_LABELS[loc]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ── TAB HISTORIAL — se carga en tiempo real desde Firebase ── */}
          {tab === 'historial' && !esNuevo && (
            <HistorialTab empleadoId={empleado.id} colors={colors} />
          )}

        </div>

        {/* Confirmación de guardado */}
        {guardado && (
          <div className="ps-row" style={{ backgroundColor: '#EAF3DE', borderRadius: 9, padding: 10, marginTop: 12, gap: 8 }}>
            <FiCheckCircle size={15} color="#27500A" />
            <span style={{ fontSize: 13, color: '#27500A', fontWeight: 600 }}>Cambios guardados correctamente</span>
          </div>
        )}

        {/* Botones footer */}
        <div className="ps-row" style={{ gap: 10, marginTop: 16 }}>
          {!esNuevo && tab !== 'historial' && tab !== 'datos' && (
            <button type="button" onClick={onClose} className="ps-btn ps-btn-secondary">
              <span className="ps-btn-secondary-text">Cancelar</span>
            </button>
          )}
          {!esNuevo && tab !== 'historial' && tab !== 'datos' && (
            <button type="button" onClick={handleGuardar} className="ps-btn ps-btn-primary">
              <span className="ps-btn-primary-text">Guardar cambios</span>
            </button>
          )}
          {esNuevo && (
            <button type="button" onClick={handleGuardar} className="ps-btn ps-btn-primary">
              <span className="ps-btn-primary-text">Crear empleado</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Tarjeta de empleado (card view) ─────────────────────────────────────────
function EmpleadoCard({ emp, onPress, colors, horariosLocales }) {
  const rol    = ROLES[emp.rol];
  const turno  = emp.turno ? TURNOS[emp.turno] : null; // administrador no tiene turno
  const rangoTurno = obtenerRangoTurno(horariosLocales, emp.localAsignado, emp.turno);
  const enLinea = !!emp.sesionActiva;
  const locales  = localesDeEmpleado(emp);
  const localCol = locales[0] ? LOCAL_COLORS[locales[0]] : null;

  return (
    <button
      type="button"
      onClick={() => onPress(emp)}
      className="ps-emp-card ps-reset-btn"
      style={{
        backgroundColor: colors.surface, borderColor: colors.border,
        opacity: !emp.activo ? 0.6 : 1,
      }}
    >
      {/* Avatar + estado online */}
      <div style={{ position: 'relative', marginRight: 12 }}>
        <div className="ps-avatar" style={{ backgroundColor: rol.bg }}>
          <span className="ps-avatar-text" style={{ color: rol.text }}>{getInitials(emp.nombre)}</span>
        </div>
        <span className="ps-online-dot" style={{ backgroundColor: enLinea ? '#639922' : '#BDC3C7' }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ps-row" style={{ gap: 6, marginBottom: 3 }}>
          <p className="ps-emp-nombre" style={{ color: colors.textPrimary }}>{emp.nombre}</p>
          {!emp.activo && <Badge label="Inactivo" level="neutral" />}
        </div>
        <p className="ps-emp-rut" style={{ color: colors.textSecondary, margin: 0 }}>{emp.rut}</p>
        <div className="ps-row" style={{ gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
          {/* Rol */}
          <span className="ps-mini-chip ps-row" style={{ backgroundColor: rol.bg, gap: 3 }}>
            <RolIcon rol={emp.rol} size={10} color={rol.text} />
            <span className="ps-mini-chip-text" style={{ color: rol.text }}>{rol.label}</span>
          </span>
          {/* Local (solo cajero) */}
          {locales.length > 0 && localCol && (
            <span className="ps-mini-chip ps-row" style={{ backgroundColor: localCol.bg, gap: 3 }}>
              <LocalIcon loc={locales[0]} size={10} color={localCol.text} />
              <span className="ps-mini-chip-text" style={{ color: localCol.text }}>
                {LOCAL_LABELS[locales[0]]}{locales.length > 1 ? ` +${locales.length - 1}` : ''}
              </span>
            </span>
          )}
          {/* Turno (no aplica a administrador) */}
          {turno && (
            <span className="ps-mini-chip ps-row" style={{ backgroundColor: '#F0F3F4', gap: 3 }}>
              <TurnoIcon turno={emp.turno} size={10} color="#7F8C8D" />
              <span className="ps-mini-chip-text" style={{ color: '#7F8C8D' }}>
                {turno.label}{rangoTurno ? ` · ${rangoTurno.hora_inicio}–${rangoTurno.hora_fin}` : ''}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Hora ultimo inicio sesión */}
      <div className="ps-col" style={{ alignItems: 'flex-end', gap: 4 }}>
        {enLinea && (
          <div className="ps-row" style={{ gap: 3 }}>
            <FiCircle size={7} color="#639922" />
            <span style={{ fontSize: 10, color: '#639922', fontWeight: 600 }}>En línea</span>
          </div>
        )}
        <span style={{ fontSize: 10, color: colors.textSecondary }}>
          {formatFechaHora(emp.ultimaConexion)}
        </span>
        {emp.restriccionHorario && (
          <div className="ps-row" style={{ gap: 3 }}>
            <FiLock size={10} color="#378ADD" />
            <span style={{ fontSize: 10, color: '#378ADD' }}>horario</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Fila de tabla (table view) ───────────────────────────────────────────────
function EmpleadoFila({ emp, onPress, colors: colorsProp, isLast, horariosLocales }) {
  const { colors: colorsTheme } = useTheme();
  const colors  = colorsProp ?? colorsTheme;
  const rol     = ROLES[emp.rol]   ?? { bg: '#F0F3F4', text: '#7F8C8D', label: emp.rol };
  const turno   = emp.turno ? (TURNOS[emp.turno] ?? { label: emp.turno }) : null; // administrador no tiene turno
  const rangoTurno = obtenerRangoTurno(horariosLocales, emp.localAsignado, emp.turno);
  const enLinea = !!emp.sesionActiva;
  const locales  = localesDeEmpleado(emp);
  const localCol = locales[0] ? LOCAL_COLORS[locales[0]] : null;

  return (
    <button
      type="button"
      onClick={() => onPress(emp)}
      className="ps-table-row ps-reset-btn"
      style={{
        borderBottom: isLast ? 'none' : `0.5px solid ${colors.border}`,
        backgroundColor: !emp.activo ? '#FAFBFC' : 'transparent',
        opacity: !emp.activo ? 0.7 : 1,
      }}
    >
      {/* Nombre + RUT */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <div className="ps-avatar-sm" style={{ backgroundColor: rol.bg }}>
          <span className="ps-avatar-sm-text" style={{ color: rol.text }}>{getInitials(emp.nombre)}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.nombre}</p>
          <p style={{ fontSize: 10, color: colors.textSecondary, margin: 0 }}>{emp.rut}</p>
        </div>
      </div>

      {/* Rol */}
      <div style={{ flex: 1 }}>
        <span className="ps-mini-chip ps-row" style={{ backgroundColor: rol.bg, gap: 3 }}>
          <RolIcon rol={emp.rol} size={10} color={rol.text} />
          <span className="ps-mini-chip-text" style={{ color: rol.text }}>{rol.label}</span>
        </span>
      </div>

      {/* Local */}
      <div style={{ flex: 1 }}>
        {locales.length > 0 && localCol ? (
          <div className="ps-col" style={{ gap: 2, alignItems: 'flex-start' }}>
            {locales.slice(0, 2).map(loc => {
              const lc = LOCAL_COLORS[loc];
              return (
                <span key={loc} className="ps-mini-chip ps-row" style={{ backgroundColor: lc?.bg, gap: 3 }}>
                  <LocalIcon loc={loc} size={10} color={lc?.text} />
                  <span className="ps-mini-chip-text" style={{ color: lc?.text }}>{LOCAL_LABELS[loc]}</span>
                </span>
              );
            })}
            {locales.length > 2 && (
              <span style={{ fontSize: 10, color: colors.textSecondary }}>+{locales.length - 2} más</span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: colors.textSecondary }}>Sin local</span>
        )}
      </div>

      {/* Turno (no aplica a administrador) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {turno ? (
          <>
            <TurnoIcon turno={emp.turno} size={11} color={colors.textSecondary} />
            <div>
              <p style={{ fontSize: 11, color: colors.textSecondary, margin: 0 }}>{turno.label}</p>
              <p style={{ fontSize: 10, color: colors.textSecondary, margin: 0 }}>
                {rangoTurno ? `${rangoTurno.hora_inicio}–${rangoTurno.hora_fin}` : '—'}
              </p>
            </div>
          </>
        ) : (
          <span style={{ fontSize: 11, color: colors.textSecondary }}>Sin turno</span>
        )}
      </div>

      {/* Hora ultimo inicio sesión */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div className="ps-row" style={{ gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: enLinea ? '#639922' : '#BDC3C7', marginTop: 1 }} />
          <span style={{ fontSize: 10, color: colors.textSecondary }}>{formatFechaHora(emp.ultimaConexion)}</span>
        </div>
        {!emp.activo && <Badge label="Inactivo" level="neutral" />}
      </div>
    </button>
  );
}

// ─── Fila compacta para tabla mobile ─────────────────────────────────────────
function EmpleadoFilaMobile({ emp, onPress, colors, isLast, horariosLocales }) {
  const rol    = ROLES[emp.rol]    ?? { bg: '#F0F3F4', text: '#7F8C8D', label: emp.rol };
  const turno  = emp.turno ? (TURNOS[emp.turno] ?? { label: emp.turno }) : null; // administrador no tiene turno
  const rangoTurno = obtenerRangoTurno(horariosLocales, emp.localAsignado, emp.turno);
  const enLinea = !!emp.sesionActiva;

  return (
    <button
      type="button"
      onClick={() => onPress(emp)}
      className="ps-table-row ps-reset-btn"
      style={{
        borderBottom: isLast ? 'none' : `0.5px solid ${colors.border}`,
        backgroundColor: !emp.activo ? '#FAFBFC' : 'transparent',
        opacity: !emp.activo ? 0.7 : 1,
      }}
    >
      {/* Empleado */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <div className="ps-avatar-sm" style={{ backgroundColor: rol.bg }}>
            <span className="ps-avatar-sm-text" style={{ color: rol.text }}>{getInitials(emp.nombre)}</span>
          </div>
          <span style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: enLinea ? '#639922' : '#BDC3C7', position: 'absolute', bottom: 0, right: 0, border: '1px solid #FFFFFF' }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.nombre}</p>
          <p style={{ fontSize: 10, color: colors.textSecondary, margin: 0 }}>{emp.rut}</p>
        </div>
      </div>

      {/* Rol */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <span className="ps-mini-chip ps-row" style={{ backgroundColor: rol.bg, gap: 3 }}>
          <RolIcon rol={emp.rol} size={9} color={rol.text} />
          <span className="ps-mini-chip-text" style={{ color: rol.text }}>{rol.label}</span>
        </span>
      </div>

      {/* Turno (no aplica a administrador) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {turno ? (
          <>
            <TurnoIcon turno={emp.turno} size={10} color={colors.textSecondary} />
            <span style={{ fontSize: 10, color: colors.textSecondary }}>
              {turno.label}{rangoTurno ? ` · ${rangoTurno.hora_inicio}–${rangoTurno.hora_fin}` : ''}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 10, color: colors.textSecondary }}>Sin turno</span>
        )}
      </div>
    </button>
  );
}

// ─── Métricas KPI ─────────────────────────────────────────────────────────────
function MetricasPersonal({ usuarios, colors }) {
  const total      = usuarios.length;
  const activos    = usuarios.filter(e => e.activo).length;
  const enLinea    = usuarios.filter(e => estaEnLinea(e.ultimaConexion)).length;
  const cajeros    = usuarios.filter(e => e.rol === 'cajero').length;
  const repartidores = usuarios.filter(e => e.rol === 'repartidor').length;
  const admins     = usuarios.filter(e => e.rol === 'administrador').length;

  const metricas = [
    { label: 'Total',        value: total,   color: colors.textPrimary },
    { label: 'Activos',      value: activos, color: '#639922' },
    { label: 'En línea',     value: enLinea, color: enLinea > 0 ? '#378ADD' : colors.textPrimary },
    { label: 'Cajeros',      value: cajeros, color: colors.textPrimary },
    { label: 'Repartidores', value: repartidores, color: colors.textPrimary },
    { label: 'Admins',       value: admins,  color: '#BA7517' },
  ];

  return (
    <div className="ps-row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {metricas.map((m, i) => (
        <div key={i} className="ps-kpi-card" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <p className="ps-kpi-label" style={{ color: colors.textSecondary, margin: 0 }}>{m.label}</p>
          <p className="ps-kpi-value" style={{ color: m.color, margin: 0 }}>{m.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Barra de filtros ─────────────────────────────────────────────────────────
function FiltroBar({ filtros, setFiltros, colors }) {
  return (
    <div className="ps-row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>

      {/* Búsqueda */}
      <div className="ps-search-box" style={{ borderColor: colors.border, backgroundColor: colors.surface, flex: 1, minWidth: 160 }}>
        <FiSearch size={13} color={colors.textSecondary} />
        <input
          className="ps-search-input"
          style={{ color: colors.textPrimary }}
          placeholder="Buscar nombre o RUT..."
          value={filtros.busqueda}
          onChange={e => setFiltros(p => ({ ...p, busqueda: e.target.value }))}
        />
      </div>

      {/* Rol */}
      {[{ id: null, label: 'Todos' }, { id: 'cajero', label: 'Cajero' }, { id: 'repartidor', label: 'Repartidor' }, { id: 'administrador', label: 'Admin' }].map(r => (
        <button key={String(r.id)} type="button" onClick={() => setFiltros(p => ({ ...p, rol: r.id }))}
          className="ps-filter-chip"
          style={{
            borderColor: filtros.rol === r.id ? '#2C3E50' : colors.border,
            backgroundColor: filtros.rol === r.id ? '#2C3E50' : 'transparent',
          }}>
          {r.id && <RolIcon rol={r.id} size={10} color={filtros.rol === r.id ? '#FFFFFF' : colors.textSecondary} />}
          <span className="ps-filter-chip-text" style={{ color: filtros.rol === r.id ? '#FFFFFF' : colors.textSecondary }}>{r.label}</span>
        </button>
      ))}

      {/* Local */}
      {[{ id: null, label: 'Todos los locales' }, ...LOCALES_LIST.map(l => ({ id: l, label: LOCAL_LABELS[l] }))].map(l => (
        <button key={String(l.id)} type="button" onClick={() => setFiltros(p => ({ ...p, local: l.id }))}
          className="ps-filter-chip"
          style={{
            borderColor: filtros.local === l.id ? '#2C3E50' : colors.border,
            backgroundColor: filtros.local === l.id ? '#2C3E50' : 'transparent',
          }}>
          {l.id && <LocalIcon loc={l.id} size={10} color={filtros.local === l.id ? '#FFFFFF' : colors.textSecondary} />}
          <span className="ps-filter-chip-text" style={{ color: filtros.local === l.id ? '#FFFFFF' : colors.textSecondary }}>{l.label}</span>
        </button>
      ))}

      {/* Solo activos */}
      <button type="button" onClick={() => setFiltros(p => ({ ...p, soloActivos: !p.soloActivos }))}
        className="ps-filter-chip"
        style={{
          borderColor: filtros.soloActivos ? '#639922' : colors.border,
          backgroundColor: filtros.soloActivos ? '#639922' : 'transparent',
        }}>
        <span className="ps-filter-chip-text" style={{ color: filtros.soloActivos ? '#FFFFFF' : colors.textSecondary }}>Solo activos</span>
      </button>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT DESKTOP
// ─────────────────────────────────────────────────────────────────────────────
function DesktopLayout({ usuarios, onGuardar, onDesactivar, onClose, esAdmin, verificarDuplicados, horariosLocales }) {
  const { colors } = useTheme();
  const [vista,    setVista]    = useState('tabla'); // 'tabla' | 'cards'
  const [filtros,  setFiltros]  = useState({ busqueda: '', rol: null, local: null, soloActivos: true });
  const [modalEmpId, setModalEmpId] = useState(null);
  const modalEmp = modalEmpId === 'nuevo' ? null : usuarios.find(e => e.id === modalEmpId) ?? null;

  const empFiltrados = useMemo(() => usuarios.filter(e => {
    // Nadie ve empleados con rol "admin" en esta lista, ni siquiera otro "admin".
    if (e.rol === 'admin') return false;
    // Solo el super-admin (usuario.rol === 'admin') puede ver empleados con rol "administrador".
    // Un "administrador" que mira la lista no ve a otros administradores.
    if (!esAdmin && e.rol === 'administrador') return false;
    if (filtros.soloActivos && !e.activo) return false;
    if (filtros.rol   && e.rol   !== filtros.rol)   return false;
    if (filtros.local && !localesAsignados(e.localAsignado).includes(filtros.local)) return false;
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      if (!e.nombre.toLowerCase().includes(q) && !e.rut.includes(q)) return false;
    }
    return true;
  }), [usuarios, filtros, esAdmin]);

  return (
    <div className="psd-screen" style={{ backgroundColor: colors.bg }}>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Topbar */}
        <div className="psd-topbar" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
          <div className="ps-row" style={{ gap: 8 }}>
            <FaUsers size={18} color={colors.textPrimary} />
            <div>
              <p className="psd-topbar-title" style={{ color: colors.textPrimary }}>Gestión de Personal</p>
              <p className="psd-topbar-sub" style={{ color: colors.textSecondary }}>
                {usuarios.filter(e => e.activo).length} activos · {usuarios.filter(e => estaEnLinea(e.ultimaConexion)).length} en línea ahora
              </p>
            </div>
          </div>

          <div className="ps-row" style={{ gap: 10 }}>
            <button
              type="button"
              onClick={() => setModalEmpId('nuevo')}
              className="ps-btn-primary ps-reset-btn ps-row"
              style={{ paddingLeft: 14, paddingRight: 14, paddingTop: 9, paddingBottom: 9, borderRadius: 9, gap: 6 }}
            >
              <FiPlus size={14} color="#FFFFFF" />
              <span className="ps-btn-primary-text" style={{ fontSize: 13 }}>Nuevo empleado</span>
            </button>

            {/* Botón cerrar */}
            <button type="button" className="ps-reset-btn" onClick={onClose}>
              <FiX size={20} color="#7F8C8D" />
            </button>
          </div>
        </div>

        <div className="ps-scroll" style={{ flex: 1, padding: 16, paddingBottom: 40 }}>

          {/* KPIs */}
          <MetricasPersonal usuarios={usuarios} colors={colors} />

          {/* Filtros + toggle vista */}
          <div className="ps-row" style={{ justifyContent: 'space-between', marginTop: 16, marginBottom: 4 }}>
            <p className="ps-section-label" style={{ color: colors.textSecondary, margin: 0 }}>EMPLEADOS · {empFiltrados.length}</p>
            <div className="ps-row" style={{ gap: 4 }}>
              {[{ id: 'tabla', Icon: FiList }, { id: 'cards', Icon: FiGrid }].map(v => (
                <button key={v.id} type="button" onClick={() => setVista(v.id)}
                  className="ps-vista-btn"
                  style={vista === v.id ? { backgroundColor: '#2C3E50' } : {}}>
                  <v.Icon size={14} color={vista === v.id ? '#FFFFFF' : colors.textSecondary} />
                </button>
              ))}
            </div>
          </div>

          <FiltroBar filtros={filtros} setFiltros={setFiltros} colors={colors} />

          {/* Vista tabla */}
          {vista === 'tabla' && (
            <div className="ps-table-wrap" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
              {/* Header tabla */}
              <div className="ps-table-header" style={{ borderBottomColor: colors.border, backgroundColor: colors.bg }}>
                {['Empleado', 'Rol', 'Local', 'Turno', 'Hora ultimo inicio sesión'].map(h => (
                  <span key={h} className="ps-table-header-text" style={{ color: colors.textSecondary, flex: h === 'Empleado' ? 2 : h === 'Hora ultimo inicio sesión' ? 1.2 : 1 }}>{h}</span>
                ))}
              </div>
              {empFiltrados.length === 0 ? (
                <div className="ps-empty-box" style={{ border: 'none', margin: 16 }}>
                  <FiUser size={22} color="#BDC3C7" style={{ marginBottom: 6 }} />
                  <p className="ps-empty-text" style={{ color: colors.textSecondary }}>Sin empleados con los filtros aplicados</p>
                </div>
              ) : empFiltrados.map((emp, i) => (
                <EmpleadoFila key={emp.id} emp={emp} colors={colors} horariosLocales={horariosLocales}
                  onPress={e => setModalEmpId(e.id)} isLast={i === empFiltrados.length - 1} />
              ))}
            </div>
          )}

          {/* Vista cards */}
          {vista === 'cards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {empFiltrados.length === 0 ? (
                <div className="ps-empty-box" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <FiUser size={22} color="#BDC3C7" style={{ marginBottom: 6 }} />
                  <p className="ps-empty-text" style={{ color: colors.textSecondary }}>Sin empleados con los filtros aplicados</p>
                </div>
              ) : empFiltrados.map(emp => (
                <EmpleadoCard key={emp.id} emp={emp} colors={colors} horariosLocales={horariosLocales} onPress={e => setModalEmpId(e.id)} />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Modal empleado */}
      {!!modalEmpId && (
        <ModalEmpleado
          visible={!!modalEmpId}
          empleado={modalEmp}
          esNuevo={modalEmpId === 'nuevo'}
          esAdmin={esAdmin}
          onClose={() => setModalEmpId(null)}
          onGuardar={onGuardar}
          onDesactivar={onDesactivar}
          verificarDuplicados={verificarDuplicados}
          horariosLocales={horariosLocales}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT MOBILE
// ─────────────────────────────────────────────────────────────────────────────
function MobileLayout({ usuarios, onGuardar, onDesactivar, onClose, esAdmin, verificarDuplicados, horariosLocales }) {
  const { colors } = useTheme();
  const [filtros,  setFiltros]  = useState({ busqueda: '', rol: null, local: null, soloActivos: true });
  const [modalEmpId, setModalEmpId] = useState(null);
  const modalEmp = modalEmpId === 'nuevo' ? null : usuarios.find(e => e.id === modalEmpId) ?? null;
  const [vista,    setVista]    = useState('cards'); // 'cards' | 'tabla'

  const empFiltrados = useMemo(() => usuarios.filter(e => {
    // Nadie ve empleados con rol "admin" en esta lista, ni siquiera otro "admin".
    if (e.rol === 'admin') return false;
    // Solo el super-admin (usuario.rol === 'admin') puede ver empleados con rol "administrador".
    // Un "administrador" que mira la lista no ve a otros administradores.
    if (!esAdmin && e.rol === 'administrador') return false;
    if (filtros.soloActivos && !e.activo) return false;
    if (filtros.rol   && e.rol   !== filtros.rol)   return false;
    if (filtros.local && !localesAsignados(e.localAsignado).includes(filtros.local)) return false;
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      if (!e.nombre.toLowerCase().includes(q) && !e.rut.includes(q)) return false;
    }
    return true;
  }), [usuarios, filtros, esAdmin]);

  return (
    <div className="ps-screen" style={{ backgroundColor: colors.bg }}>

      {/* Header */}
      <div className="ps-header" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
        <div className="ps-row" style={{ gap: 8 }}>
          <FaUsers size={16} color={colors.textPrimary} />
          <div>
            <p className="ps-header-title" style={{ color: colors.textPrimary, margin: 0 }}>Personal</p>
            <p className="ps-header-sub" style={{ color: colors.textSecondary, margin: 0 }}>
              {usuarios.filter(e => e.activo).length} activos · {usuarios.filter(e => estaEnLinea(e.ultimaConexion)).length} en línea
            </p>
          </div>
        </div>
        <button type="button" className="ps-reset-btn" onClick={onClose}>
          <FiX size={20} color="#7F8C8D" />
        </button>
      </div>

      <div className="ps-scroll" style={{ flex: 1, padding: 12, paddingBottom: 40 }}>

        {/* KPIs */}
        <MetricasPersonal usuarios={usuarios} colors={colors} />

        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <FiltroBar filtros={filtros} setFiltros={setFiltros} colors={colors} />
        </div>

        {/* Section label + vista toggle */}
        <div className="ps-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <p className="ps-section-label" style={{ color: colors.textSecondary, margin: 0 }}>
            EMPLEADOS · {empFiltrados.length}
          </p>
          <div className="ps-row" style={{ gap: 4 }}>
            {[{ id: 'cards', Icon: FiGrid }, { id: 'tabla', Icon: FiList }].map(v => (
              <button key={v.id} type="button" onClick={() => setVista(v.id)}
                className="ps-vista-btn"
                style={vista === v.id ? { backgroundColor: '#2C3E50' } : {}}>
                <v.Icon size={14} color={vista === v.id ? '#FFFFFF' : colors.textSecondary} />
              </button>
            ))}
          </div>
        </div>

        {/* Vista cards */}
        {vista === 'cards' && (
          empFiltrados.length === 0 ? (
            <div className="ps-empty-box" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <FiUser size={22} color="#BDC3C7" style={{ marginBottom: 6 }} />
              <p className="ps-empty-text" style={{ color: colors.textSecondary }}>Sin empleados con los filtros aplicados</p>
            </div>
          ) : empFiltrados.map(emp => (
            <EmpleadoCard key={emp.id} emp={emp} colors={colors} horariosLocales={horariosLocales} onPress={e => setModalEmpId(e.id)} />
          ))
        )}

        {/* Vista tabla */}
        {vista === 'tabla' && (
          <div className="ps-table-wrap" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
            <div className="ps-table-header" style={{ borderBottomColor: colors.border, backgroundColor: colors.bg }}>
              {['Empleado', 'Rol', 'Turno'].map(h => (
                <span key={h} className="ps-table-header-text" style={{ color: colors.textSecondary, flex: h === 'Empleado' ? 2 : 1 }}>{h}</span>
              ))}
            </div>
            {empFiltrados.length === 0 ? (
              <div className="ps-empty-box" style={{ border: 'none', margin: 16 }}>
                <FiUser size={22} color="#BDC3C7" style={{ marginBottom: 6 }} />
                <p className="ps-empty-text" style={{ color: colors.textSecondary }}>Sin empleados con los filtros aplicados</p>
              </div>
            ) : empFiltrados.map((emp, i) => (
              <EmpleadoFilaMobile key={emp.id} emp={emp} colors={colors} horariosLocales={horariosLocales}
                onPress={e => setModalEmpId(e.id)} isLast={i === empFiltrados.length - 1} />
            ))}
          </div>
        )}

        {/* Botón nuevo */}
        <button type="button" onClick={() => setModalEmpId('nuevo')}
          className="ps-btn-primary ps-reset-btn ps-row"
          style={{ borderRadius: 10, padding: 13, justifyContent: 'center', marginTop: 12, gap: 6, width: '100%' }}>
          <FiPlus size={15} color="#FFFFFF" />
          <span className="ps-btn-primary-text">Nuevo empleado</span>
        </button>

      </div>

      {!!modalEmpId && (
        <ModalEmpleado
          visible={!!modalEmpId}
          empleado={modalEmp}
          esNuevo={modalEmpId === 'nuevo'}
          esAdmin={esAdmin}
          onClose={() => setModalEmpId(null)}
          onGuardar={onGuardar}
          onDesactivar={onDesactivar}
          verificarDuplicados={verificarDuplicados}
          horariosLocales={horariosLocales}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function PersonalModal({ visible, onClose }) {
  const width      = useWindowWidth();
  const isDesktop  = width >= DESKTOP_BREAKPOINT;

  const [usuarios, setPersonal] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [horariosLocales, setHorariosLocales] = useState({});

  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';

  // Suscripción en tiempo real al usuarios
  useEffect(() => {
    if (!visible) return;
    setCargando(true);
    setError(null);
    const cancelar = suscribirPersonal((empleados) => {
      // Excluir al usuario que inició sesión de la lista
      const sinMiUsuario = empleados.filter(e => e.id !== usuario?.id && e.email !== usuario?.email);
      setPersonal(sinMiUsuario);
      setCargando(false);
    });
    return () => cancelar();
  }, [visible, usuario?.id, usuario?.email]);

  // Carga los horarios (turnoDia/turnoNoche) de los 3 locales una sola vez al
  // abrir el modal. Como son solo 3 nodos, se cargan todos de una y se
  // reparten como prop hacia las tarjetas/tablas/formulario — así ninguno de
  // esos componentes necesita hacer su propio fetch.
  useEffect(() => {
    if (!visible) return;
    let activo = true;
    Promise.all(LOCALES_LIST.map((loc) => obtenerHorarioLocal(loc)))
      .then((modelos) => {
        if (!activo) return;
        const mapa = {};
        LOCALES_LIST.forEach((loc, i) => { mapa[loc] = modelos[i]; });
        setHorariosLocales(mapa);
      })
      .catch((err) => console.error('Error al cargar horarios de locales:', err));
    return () => { activo = false; };
  }, [visible]);

  const verificarDuplicados = useCallback(async (rut, email) => {
    return verificarDuplicadosEmpleado(rut, email);
  }, []);

  const handleGuardar = useCallback(async (emp, passwordTemporal) => {
    try {
      if (!emp.id) {
        await crearEmpleado(emp, passwordTemporal);
      } else {
        await actualizarEmpleado(emp.id, emp);
      }
      return true;
    } catch (err) {
      console.error('Error al guardar empleado:', err);
      setError('No se pudo guardar el empleado. Intenta de nuevo.');
      return false;
    }
  }, []);

  const handleDesactivar = useCallback(async (id) => {
    try {
      const emp = usuarios.find(e => e.id === id);
      if (!emp) return;
      await toggleActivoEmpleado(id, !emp.activo);
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      setError('No se pudo cambiar el estado. Intenta de nuevo.');
    }
  }, [usuarios]);

  if (!visible) return null;

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div
        className="ps-overlay-inner"
        style={{
          marginTop: isDesktop ? 40 : 0,
          marginLeft: isDesktop ? 40 : 0,
          marginRight: isDesktop ? 40 : 0,
          marginBottom: isDesktop ? 40 : 0,
          borderTopLeftRadius: isDesktop ? 20 : 0,
          borderTopRightRadius: isDesktop ? 20 : 0,
          width: isDesktop ? 'calc(100% - 80px)' : '100%',
        }}
        onClick={e => e.stopPropagation()}
      >
        {cargando ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
            <Spinner size={32} color="#2C3E50" />
            <span style={{ marginTop: 12, color: '#7F8C8D', fontSize: 13 }}>Cargando personal…</span>
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 24 }}>
            <FiAlertTriangle size={28} color="#E24B4A" style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#2C3E50', marginBottom: 6 }}>Ocurrió un error</p>
            <p style={{ fontSize: 13, color: '#7F8C8D', textAlign: 'center', marginBottom: 20 }}>{error}</p>
            <button type="button" onClick={onClose} className="ps-btn ps-btn-secondary" style={{ flex: 'none', paddingLeft: 24, paddingRight: 24 }}>
              <span className="ps-btn-secondary-text">Cerrar</span>
            </button>
          </div>
        ) : isDesktop
          ? <DesktopLayout usuarios={usuarios} onGuardar={handleGuardar} onDesactivar={handleDesactivar} onClose={onClose} esAdmin={esAdmin} verificarDuplicados={verificarDuplicados} horariosLocales={horariosLocales} />
          : <MobileLayout  usuarios={usuarios} onGuardar={handleGuardar} onDesactivar={handleDesactivar} onClose={onClose} esAdmin={esAdmin} verificarDuplicados={verificarDuplicados} horariosLocales={horariosLocales} />
        }
      </div>
    </div>
  );
}