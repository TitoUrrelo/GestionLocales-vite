import { ref, push, set, update, get, onValue, off, query, orderByChild, equalTo } from 'firebase/database';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, rtdb, firebaseConfig } from '../firebaseConfig';
import { EmpleadoModel } from '../models/EmpleadoModel';

const NODO = 'usuarios';
const NODO_HISTORIAL = 'historialPersonal';
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

function getRef(path = '') {
  return ref(rtdb, path ? `${NODO}/${path}` : NODO);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Verifica si un RUT y/o un email ya están registrados en /usuarios.
 * @param {string} rut
 * @param {string} email
 * @returns {Promise<{rut: boolean, email: boolean}>}
 */
export async function verificarDuplicadosEmpleado(rut, email) {
  const dupes = { rut: false, email: false };
  try {
    const snap = await get(ref(rtdb, NODO));
    if (snap.exists()) {
      const rutNorm   = rut.trim().toLowerCase();
      const emailNorm = email.trim().toLowerCase();
      snap.forEach(child => {
        const val = child.val();
        if ((val.rut   ?? '').trim().toLowerCase() === rutNorm)   dupes.rut   = true;
        if ((val.email ?? '').trim().toLowerCase() === emailNorm) dupes.email = true;
      });
    }
  } catch (err) {
    console.error('Error al verificar duplicados:', err);
  }
  return dupes;
}

/**
 * Crea un nuevo empleado:
 * @param {object} datosFormulario
 * @param {string} passwordTemporal
 * @returns {Promise<string>}
 */
export async function crearEmpleado(datosFormulario, passwordTemporal) {
  // Verificar que el RUT y el email no estén registrados
  const snapPersonal = await get(ref(rtdb, NODO));
  if (snapPersonal.exists()) {
    const rutNuevo   = datosFormulario.rut.trim().toLowerCase();
    const emailNuevo = datosFormulario.email.trim().toLowerCase();
    let rutDuplicado   = false;
    let emailDuplicado = false;
    snapPersonal.forEach(child => {
      const val = child.val();
      if ((val.rut   ?? '').trim().toLowerCase() === rutNuevo)   rutDuplicado   = true;
      if ((val.email ?? '').trim().toLowerCase() === emailNuevo) emailDuplicado = true;
    });
    if (rutDuplicado && emailDuplicado) {
      throw new Error('RUT_Y_EMAIL_DUPLICADO');
    } else if (rutDuplicado) {
      throw new Error('RUT ya está registrado');
    } else if (emailDuplicado) {
      throw new Error('email ya está registrado');
    }
  }

  // Crear usuario en Auth usando una app secundaria para no cerrar la sesión del admin
  const appSecundaria = initializeApp(firebaseConfig, `crear-empleado-${Date.now()}`);
  const authSecundaria = getAuth(appSecundaria);
  const credencial = await createUserWithEmailAndPassword(
    authSecundaria,
    datosFormulario.email,
    passwordTemporal,
  );
  const uid = credencial.user.uid;
  await deleteApp(appSecundaria);

  // Enviar email para que el empleado establezca su contraseña y activandola
  await sendPasswordResetEmail(auth, datosFormulario.email);

  // Guardar datos en Realtime Database usando el UID como key
  const empleado = new EmpleadoModel({ ...datosFormulario, id: uid });
  await set(ref(rtdb, `${NODO}/${uid}`), empleado.toFirebase());

  return uid;
}

/**
 * @param {string} firebaseKey
 * @param {object} datosFormulario
 */
export async function actualizarEmpleado(firebaseKey, datosFormulario) {
  const empleado = new EmpleadoModel(datosFormulario);
  const payload  = empleado.toFirebase();

  await update(getRef(firebaseKey), payload);
}

/**
 * Activa o desactiva un empleado.
 * @param {string}  firebaseKey
 * @param {boolean} nuevoEstado
 */
export async function toggleActivoEmpleado(firebaseKey, nuevoEstado) {
  await update(getRef(firebaseKey), {
    activo:        nuevoEstado,
  });
}


/**
 * @param {function} callback - Recibe EmpleadoModel[]
 * @returns {function}
 */
export function suscribirPersonal(callback) {
  const personalRef = getRef();

  const listener = onValue(personalRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const empleados = [];
    snap.forEach(child => {
      empleados.push(EmpleadoModel.fromFirebase(child.key, child.val()));
    });
    callback(empleados);
  });

  return () => off(personalRef, 'value', listener);
}

// Historial de sesiones

/**
 * Registra una entrada para inicio de turno
 * @param {string} firebaseKey
 * @param {string} turno
 */
export async function registrarEntrada(firebaseKey, turno) {
  await push(ref(rtdb, NODO_HISTORIAL), {
    empleadoId: firebaseKey,
    entrada:    obtenerFechaHoraCL(),
    salida:     null,
    turno,
  });

  await update(getRef(firebaseKey), {
    ultimaConexion: new Date().toISOString(),
  });
}

/**
 * Registra la salida en el registro más reciente sin salida
 * @param {string} firebaseKey
 */
export async function registrarSalida(firebaseKey) {
  const qHistorial = query(
    ref(rtdb, NODO_HISTORIAL),
    orderByChild('empleadoId'),
    equalTo(firebaseKey),
  );
  const snap = await get(qHistorial);
  if (!snap.exists()) return;

  let keyPendiente = null;
  snap.forEach(child => {
    const val = child.val();
    if (!val.salida) keyPendiente = child.key;
  });
  if (!keyPendiente) return;

  await update(ref(rtdb, `${NODO_HISTORIAL}/${keyPendiente}`), {
    salida: obtenerFechaHoraCL(),
  });
}

/**
 * Obtiene una sola vez el historial de un empleado
 * @param {string} firebaseKey
 * @returns {Promise<Array<{id: string, entrada: string, salida: string|null, turno: string}>>}
 */
export async function obtenerHistorialEmpleado(firebaseKey) {
  const qHistorial = query(
    ref(rtdb, NODO_HISTORIAL),
    orderByChild('empleadoId'),
    equalTo(firebaseKey),
  );
  const snap = await get(qHistorial);
  if (!snap.exists()) return [];

  const historial = [];
  snap.forEach(child => {
    historial.push({ id: child.key, ...child.val() });
  });
  return historial;
}

/**
 * @param {string} firebaseKey
 * @param {function} callback
 * @returns {function}
 */
export function suscribirHistorialEmpleado(firebaseKey, callback) {
  const qHistorial = query(
    ref(rtdb, NODO_HISTORIAL),
    orderByChild('empleadoId'),
    equalTo(firebaseKey),
  );

  const listener = onValue(qHistorial, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const historial = [];
    snap.forEach(child => {
      historial.push({ id: child.key, ...child.val() });
    });
    callback(historial);
  });

  return () => off(qHistorial, 'value', listener);
}