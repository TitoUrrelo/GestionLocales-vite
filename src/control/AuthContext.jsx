import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, off, get, onDisconnect, set } from 'firebase/database';
import { auth, rtdb } from '../firebaseConfig';
import { logoutEmpleado, actualizarPresencia } from './AuthControl';
import { obtenerHorarioLocal, LOCAL_POR_DEFECTO } from '../control/LocalControl'; // TODO: ajustar la ruta según donde guardes LocalControl.jsx

const AuthContext = createContext(null);

// traducir turno 
function tipoTurnoKey(turno) {
  return turno === 'noche' ? 'turnoNoche' : 'turnoDia';
}

/**
 * @param {string} turno - dia | noche
 * @param {import('../models/LocalModel').LocalModel} horarioLocal - horario del local asignado
 */
function estaDentroDelTurno(turno, horarioLocal) {
  if (!horarioLocal) return true;

  const turnoModel = horarioLocal.getTurno(tipoTurnoKey(turno));
  if (!turnoModel) return true;

  const ahora = new Date();
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
  const inicio = turnoModel.inicioEnMinutos();
  const fin = turnoModel.finEnMinutos();

  if (turnoModel.cruzaMedianoche()) {
    return minutosActuales >= inicio || minutosActuales < fin;
  }
  return minutosActuales >= inicio && minutosActuales < fin;
}

/** Un admin/administrador nunca tiene restricción de turno. */
function esAdministrador(datos) {
  return datos?.rol === 'admin' || datos?.rol === 'administrador';
}

/**
 * @param {object} localAsignado
 * @returns {string[]}
 */
export function localesAsignados(localAsignado) {
  if (!localAsignado || typeof localAsignado !== 'object') return [];
  return Object.entries(localAsignado)
    .filter(([, asignado]) => asignado === true)
    .map(([nombre]) => nombre);
}

/**
 * Minutos restantes hasta que termine el turno actual del empleado.
 * @param {string} turno - dia | noche
 * @param {import('../models/LocalModel').LocalModel} horarioLocal - horario del local asignado
 * @returns {number|null} minutos restantes, o null si no hay restricción horaria
 */
export function minutosHastaFinTurno(turno, horarioLocal) {
  if (!horarioLocal) return null;

  const turnoModel = horarioLocal.getTurno(tipoTurnoKey(turno));
  if (!turnoModel) return null;

  const inicio    = turnoModel.inicioEnMinutos();
  const fin       = turnoModel.finEnMinutos();
  const ahora     = new Date();
  const minActual = ahora.getHours() * 60 + ahora.getMinutes();

  if (turnoModel.cruzaMedianoche()) {
    if (minActual >= inicio) {
      return (24 * 60 - minActual) + fin;
    }
    return minActual < fin ? fin - minActual : 0;
  }

  return minActual < fin ? fin - minActual : 0;
}

function getLocalInicial(datosUsuario) {
  const locales = localesAsignados(datosUsuario?.localAsignado);
  return locales.length > 0 ? locales[0] : 'comida';
}

// Ademas de considerar el onDisconnect en caso de crashear o quedar sin internet, aseguramos que el al perder conexion en 90s o cerrar la pagina cambie a desconctado
const UMBRAL_PRESENCIA_MS = 90 * 1000; // 90s

export function estaRealmenteEnLinea(usuario) {
  if (!usuario?.sesionActiva || !usuario?.ultimaConexion) return false;
  const ultima = new Date(usuario.ultimaConexion).getTime();
  return Date.now() - ultima < UMBRAL_PRESENCIA_MS;
}

export function AuthProvider({ children }) {
  const [usuario,     setUsuario]     = useState(null);
  const [cargando,    setCargando]    = useState(true);
  const [localActivo, setLocalActivo] = useState('comida');

  const cierreAutoRef  = useRef(null);
  const advertenciaRef = useRef(null);

  function limpiarTimers() {
    if (cierreAutoRef.current)  clearTimeout(cierreAutoRef.current);
    if (advertenciaRef.current) clearTimeout(advertenciaRef.current);
    cierreAutoRef.current  = null;
    advertenciaRef.current = null;
  }

  // Autenticacion

  useEffect(() => {
    let unsubDB = null;
    let unsubPresencia = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubDB) { unsubDB(); unsubDB = null; }
      if (unsubPresencia) { unsubPresencia(); unsubPresencia = null; }
      limpiarTimers();

      if (!firebaseUser) {
        setUsuario(null);
        setCargando(false);
        return;
      }

      const snap = await get(ref(rtdb, `usuarios/${firebaseUser.uid}`));

      if (snap.exists()) {
        const datos = snap.val();

        if (datos.restriccionHorario && !esAdministrador(datos)) {
          const nombreLocal = localesAsignados(datos.localAsignado)[0] ?? LOCAL_POR_DEFECTO;
          const horario = await obtenerHorarioLocal(nombreLocal);
          if (!estaDentroDelTurno(datos.turno, horario)) {
            await logoutEmpleado();
            return;
          }
        }
        // `.info/connected` refleja el estado real en la BD onDisconnect() se registra en el SERVIDOR de Firebase: si el cliente pierde, crashea, cierra la pestaña cambia sesionActiva a false y ultimaConexion deja de actualizarse 
        const sesionActivaRef   = ref(rtdb, `usuarios/${firebaseUser.uid}/sesionActiva`);
        const ultimaConexionRef = ref(rtdb, `usuarios/${firebaseUser.uid}/ultimaConexion`);
        const connectedRef      = ref(rtdb, '.info/connected');

        unsubPresencia = onValue(connectedRef, (snapConectado) => {
          if (snapConectado.val() === false) return;

          onDisconnect(sesionActivaRef).set(false);
          onDisconnect(ultimaConexionRef).set(new Date().toISOString());

          set(sesionActivaRef, true);
          set(ultimaConexionRef, new Date().toISOString());
        });

        const empleadoRef = ref(rtdb, `usuarios/${firebaseUser.uid}`);
        unsubDB = onValue(empleadoRef, async (snapRT) => {
          if (snapRT.exists()) {
            const datos = snapRT.val();
            const esAdmin = esAdministrador(datos);

            let horarioLocal = null;
            if (datos.restriccionHorario && !esAdmin) {
              const nombreLocal = localesAsignados(datos.localAsignado)[0] ?? LOCAL_POR_DEFECTO;
              horarioLocal = await obtenerHorarioLocal(nombreLocal);
            }

            const nuevoUsuario = {
              uid:   firebaseUser.uid,
              email: firebaseUser.email,
              ...datos,
              esAdmin,
              horarioLocal,
            };
            setUsuario(nuevoUsuario);
            // Inicializar localActivo con el primer local asignado al usuario
            setLocalActivo(prev => {
              const locales = localesAsignados(datos.localAsignado);
              // Solo actualizar si el local actual no pertenece al usuario
              if (locales.length > 0 && !locales.includes(prev)) {
                return locales[0];
              }
              return locales.length > 0 ? prev : 'comidaRapida';
            });
          }
          setCargando(false);
        });

      } else {
        const adminRef = ref(rtdb, `usuarios/${firebaseUser.uid}`);
        off(adminRef);
        onValue(adminRef, (snapAdmin) => {
          setUsuario({
            uid:   firebaseUser.uid,
            email: firebaseUser.email,
            ...(snapAdmin.exists() ? snapAdmin.val() : { rol: null }),
          });
          setCargando(false);
        }, { onlyOnce: true });
      }
    });

    return () => {
      unsubAuth();
      if (unsubDB) unsubDB();
      if (unsubPresencia) unsubPresencia();
      limpiarTimers();
    };
  }, []);

  // Presencia periódica 

  useEffect(() => {
    if (!usuario) return;
    actualizarPresencia();
    const intervalo = setInterval(actualizarPresencia, 30 * 1000); // cada 30s
    return () => clearInterval(intervalo);
  }, [usuario?.uid]);

  // Cierre automático al fin de turno 

  useEffect(() => {
    limpiarTimers();

    if (!usuario || usuario.esAdmin || !usuario.restriccionHorario || !usuario.turno) return;

    const minsRestantes = minutosHastaFinTurno(usuario.turno, usuario.horarioLocal);
    if (!minsRestantes) {
      logoutEmpleado().catch(() => {});
      return;
    }

    const msRestantes    = minsRestantes * 60 * 1000;
    const MS_ADVERTENCIA = 15 * 60 * 1000;

    // Mostrar SessionWarningBanner como recordatorio
    if (msRestantes > MS_ADVERTENCIA) {
      advertenciaRef.current = setTimeout(() => {}, msRestantes - MS_ADVERTENCIA);
    }

    // Programar cierre automático
    cierreAutoRef.current = setTimeout(async () => {
      await logoutEmpleado().catch(() => {});
    }, msRestantes);

    return () => limpiarTimers();
  }, [usuario?.uid, usuario?.restriccionHorario, usuario?.turno, usuario?.esAdmin, usuario?.horarioLocal]);

  // Valor del contexto
  return (
    <AuthContext.Provider value={{ usuario, cargando, localActivo, setLocalActivo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}