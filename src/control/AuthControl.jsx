// control/AuthControl.js

import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { obtenerHorarioLocal, LOCAL_POR_DEFECTO } from './LocalControl';

const NODO = 'usuarios';
// Colección externa al empleado: cada registro identifica al usuario mediante
// el campo `empleadoId`, en vez de anidar el historial bajo usuarios/{uid}.
const NODO_HISTORIAL = 'historialPersonal';

let _ignorarCambioAuth = false;
export const getIgnorarCambioAuth = () => _ignorarCambioAuth;

// Zona horaria fija para que la hora/fecha registrada no dependa del huso
// horario del dispositivo/servidor donde corre el código.
const ZONA_HORARIA = 'America/Santiago';

function obtenerFechaHoraCL() {
  const ahora = new Date();

  // 'en-CA' devuelve la fecha en formato YYYY-MM-DD, ya en la zona horaria
  // indicada (evita el bug de usar toISOString(), que toma el día en UTC).
  const fecha = ahora.toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA });

  // hour12: false fuerza formato 24hrs y elimina el AM/PM.
  const hora = ahora.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA_HORARIA,
  });

  return `${fecha} ${hora}`;
}

/** Traduce 'dia' | 'noche' (el turno del empleado) a la key del nuevo modelo. */
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

  // Si el turno cruza medianoche (ej. 16:00 -> 00:00), está dentro si es
  // después de la hora de inicio O antes de la hora de fin (día siguiente).
  if (turnoModel.cruzaMedianoche()) {
    return minutosActuales >= inicio || minutosActuales < fin;
  }
  return minutosActuales >= inicio && minutosActuales < fin;
}

/** Un admin/administrador nunca queda sujeto a la restricción de turno. */
function esAdministrador(datos) {
  return datos?.rol === 'admin' || datos?.rol === 'administrador';
}

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

export async function loginEmpleado(email, password) {
  const credencial = await signInWithEmailAndPassword(auth, email, password);
  const uid = credencial.user.uid;

  const usuarioRef = doc(db, NODO, uid);
  const snap = await getDoc(usuarioRef);
  if (!snap.exists()) {
    _ignorarCambioAuth = true;
    await signOut(auth);
    _ignorarCambioAuth = false;
    throw new Error('Empleado no encontrado en la base de datos.');
  }
  const datos = snap.data();

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

  await addDoc(collection(db, NODO_HISTORIAL), {
    empleadoId: uid,
    entrada:    obtenerFechaHoraCL(),
    salida:     null,
    turno:      datos.turno ?? 'dia',
  });

  // ── Marcar sesión activa (presencia por heartbeat, sin onDisconnect) ──────
  // Firestore no tiene equivalente a onDisconnect() de RTDB, así que esta
  // marca solo se pone/quita en login/logout explícitos. La detección de
  // "en línea" real depende de que ultimaConexion se siga refrescando cada
  // 30s (ver actualizarPresencia) y del umbral en estaRealmenteEnLinea().
  await updateDoc(usuarioRef, {
    sesionActiva:   true,
    ultimaConexion: new Date().toISOString(),
  });

  return { uid, ...datos };
}

export async function logoutEmpleado() {
  const uid = auth.currentUser?.uid;

  if (uid) {
    // Registrar salida en historial (colección externa, filtrada por empleadoId)
    const qHistorial = query(collection(db, NODO_HISTORIAL), where('empleadoId', '==', uid));
    const histSnap = await getDocs(qHistorial);
    let keyPendiente = null;
    histSnap.forEach(docSnap => {
      const val = docSnap.data();
      if (!val.salida) keyPendiente = docSnap.id;
    });
    if (keyPendiente) {
      await updateDoc(doc(db, NODO_HISTORIAL, keyPendiente), {
        salida: obtenerFechaHoraCL(),
      });
    }

    // Sin onDisconnect: el logout manual es el único lugar donde se apaga
    // sesionActiva de forma inmediata. Si el cliente crashea sin pasar por
    // acá, sesionActiva queda en true pero ultimaConexion deja de avanzar,
    // así que estaRealmenteEnLinea() igual lo mostrará como desconectado
    // después del umbral de 90s.
    await updateDoc(doc(db, NODO, uid), {
      sesionActiva: false,
    });
  }

  await signOut(auth);
}

/**
 * Actualiza ultimaConexion del empleado autenticado.
 * Llamar al navegar entre pantallas y periódicamente desde AuthContext.
 */
export async function actualizarPresencia() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await updateDoc(doc(db, NODO, uid), {
      ultimaConexion: new Date().toISOString(),
    });
  } catch (_) {
    // silencioso — no interrumpir la navegación si falla
  }
}
