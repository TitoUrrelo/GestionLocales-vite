import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { ref, get, push, update, onDisconnect, query, orderByChild, equalTo } from 'firebase/database';
import { auth, rtdb } from '../firebaseConfig';
import { obtenerHorarioLocal, LOCAL_POR_DEFECTO } from './LocalControl';

const NODO = 'usuarios';
const NODO_HISTORIAL = 'historialPersonal';

let _ignorarCambioAuth = false;
export const getIgnorarCambioAuth = () => _ignorarCambioAuth;

// Zona horaria fija para que la hora/fecha 
const ZONA_HORARIA = 'America/Santiago';

function obtenerFechaHoraCL() {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA });

  // formato 24hrs sin el AM/PM.
  const hora = ahora.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA_HORARIA,
  });

  return `${fecha} ${hora}`;
}

/** Traductor de turno */
function tipoTurnoKey(turno) {
  return turno === 'noche' ? 'turnoNoche' : 'turnoDia';
}

/**
 * @param {string} turno - 'dia' | 'noche'
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
function localesAsignados(localAsignado) {
  if (!localAsignado || typeof localAsignado !== 'object') return [];
  return Object.entries(localAsignado)
    .filter(([, asignado]) => asignado === true)
    .map(([nombre]) => nombre);
}

export async function loginEmpleado(email, password) {
  const credencial = await signInWithEmailAndPassword(auth, email, password);
  const uid = credencial.user.uid;

  const snap = await get(ref(rtdb, `${NODO}/${uid}`));
  if (!snap.exists()) {
    _ignorarCambioAuth = true;
    await signOut(auth);
    _ignorarCambioAuth = false;
    throw new Error('Empleado no encontrado en la base de datos.');
  }
  const datos = snap.val();

  if (!datos.activo) {
    _ignorarCambioAuth = true;
    await signOut(auth);
    _ignorarCambioAuth = false;
    throw new Error('Tu cuenta se encuentra deshabilitada.');
  }

  if (!credencial.user.emailVerified) {
    _ignorarCambioAuth = true;
    await signOut(auth);
    _ignorarCambioAuth = false;
    await sendPasswordResetEmail(auth, email);
    throw new Error('EMAIL_NO_VERIFICADO');
  }

  if (datos.restriccionHorario && !esAdministrador(datos)) {
    const nombreLocal = localesAsignados(datos.localAsignado)[0] ?? LOCAL_POR_DEFECTO;
    const horario = await obtenerHorarioLocal(nombreLocal);

    if (!estaDentroDelTurno(datos.turno, horario)) {
      const turnoModel = horario.getTurno(tipoTurnoKey(datos.turno));
      _ignorarCambioAuth = true;
      await signOut(auth);
      _ignorarCambioAuth = false;
      throw new Error(
        `No puedes iniciar sesión. Tu turno es de ${turnoModel.hora_inicio} a ${turnoModel.hora_fin}.`
      );
    }
  }

  await push(ref(rtdb, NODO_HISTORIAL), {
    empleadoId: uid,
    entrada:    obtenerFechaHoraCL(),
    salida:     null,
    turno:      datos.turno ?? 'dia',
  });

  // sesion activa en Firebase
  await update(ref(rtdb, `${NODO}/${uid}`), {
    sesionActiva:   true,
    ultimaConexion: new Date().toISOString(),
  });

  return { uid, ...datos };
}

export async function logoutEmpleado() {
  const uid = auth.currentUser?.uid;

  if (uid) {
    // Registrar salida en historial
    const qHistorial = query(
      ref(rtdb, NODO_HISTORIAL),
      orderByChild('empleadoId'),
      equalTo(uid),
    );
    const histSnap = await get(qHistorial);
    if (histSnap.exists()) {
      let keyPendiente = null;
      histSnap.forEach(child => {
        const val = child.val();
        if (!val.salida) keyPendiente = child.key;
      });
      if (keyPendiente) {
        await update(ref(rtdb, `${NODO_HISTORIAL}/${keyPendiente}`), {
          salida: obtenerFechaHoraCL(),
        });
      }
    }

    // cancelar el onDisconnect pendiente y marcar sesión inactiva
    await onDisconnect(ref(rtdb, `${NODO}/${uid}/sesionActiva`)).cancel();
    await onDisconnect(ref(rtdb, `${NODO}/${uid}/ultimaConexion`)).cancel();

    await update(ref(rtdb, `${NODO}/${uid}`), {
      sesionActiva:  false,
    });
  }

  await signOut(auth);
}

export async function actualizarPresencia() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await update(ref(rtdb, `${NODO}/${uid}`), {
      ultimaConexion: new Date().toISOString(),
    });
  } catch (_) {
    // silencioso — no interrumpir la navegación si falla
  }
}