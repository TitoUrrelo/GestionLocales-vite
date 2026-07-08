// control/EmpleadoControl.js

import {
  collection, doc, addDoc, setDoc, updateDoc, getDoc, getDocs,
  onSnapshot, query, where,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db, firebaseConfig } from '../firebaseConfig';
import { EmpleadoModel } from '../models/EmpleadoModel';

const NODO = 'usuarios';
// Colección externa al empleado: cada registro identifica al usuario mediante
// el campo `empleadoId`, en vez de anidar el historial bajo usuarios/{uid}.
const NODO_HISTORIAL = 'historialPersonal';

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

// ─── Helpers internos ─────────────────────────────────────────────────────────

function empleadoDocRef(id) {
  return doc(db, NODO, id);
}

function empleadosColRef() {
  return collection(db, NODO);
}

function historialColRef() {
  return collection(db, NODO_HISTORIAL);
}

/**
 * Recorre toda la colección de empleados y marca si el rut y/o el email ya
 * existen (comparación normalizada: trim + lowercase).
 *
 * Nota: esto trae todos los documentos y filtra en el cliente. Se podría
 * optimizar con dos `where('rutLower', '==', ...)` / `where('emailLower', '==', ...)`
 * si en el futuro se guardan esos campos ya normalizados en cada documento —
 * pero requeriría una migración de datos, así que por ahora se mantiene el
 * mismo comportamiento.
 *
 * @param {string} rut
 * @param {string} email
 * @returns {Promise<{rutDuplicado: boolean, emailDuplicado: boolean}>}
 */
async function buscarDuplicados(rut, email) {
  const rutNorm   = rut.trim().toLowerCase();
  const emailNorm = email.trim().toLowerCase();
  let rutDuplicado   = false;
  let emailDuplicado = false;

  const snap = await getDocs(empleadosColRef());
  snap.forEach(docSnap => {
    const val = docSnap.data();
    if ((val.rut   ?? '').trim().toLowerCase() === rutNorm)   rutDuplicado   = true;
    if ((val.email ?? '').trim().toLowerCase() === emailNorm) emailDuplicado = true;
  });

  return { rutDuplicado, emailDuplicado };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Verifica si un RUT y/o un email ya están registrados en /usuarios.
 * Pensada para validar en tiempo real desde el formulario (antes de enviar),
 * sin lanzar excepciones — a diferencia de crearEmpleado, que sí las lanza.
 *
 * @param {string} rut
 * @param {string} email
 * @returns {Promise<{rut: boolean, email: boolean}>}
 */
export async function verificarDuplicadosEmpleado(rut, email) {
  try {
    const { rutDuplicado, emailDuplicado } = await buscarDuplicados(rut, email);
    return { rut: rutDuplicado, email: emailDuplicado };
  } catch (err) {
    console.error('Error al verificar duplicados:', err);
    return { rut: false, email: false };
  }
}

/**
 * Crea un nuevo empleado:
 *  1. Crea el usuario en Firebase Auth con email + contraseña temporal
 *  2. Le envía el email de verificación (el empleado pondrá su contraseña desde ahí)
 *  3. Guarda los datos en Firestore bajo /usuarios/{uid}
 *
 * Usamos el UID de Auth como id del documento para poder relacionarlos.
 *
 * @param {object} datosFormulario
 * @param {string} passwordTemporal - Contraseña provisional generada en la pantalla
 * @returns {Promise<string>} UID del nuevo empleado
 */
export async function crearEmpleado(datosFormulario, passwordTemporal) {
  // 0. Verificar que el RUT y el email no estén ya registrados en /usuarios
  const { rutDuplicado, emailDuplicado } = await buscarDuplicados(datosFormulario.rut, datosFormulario.email);
  if (rutDuplicado && emailDuplicado) {
    throw new Error('RUT_Y_EMAIL_DUPLICADO');
  } else if (rutDuplicado) {
    throw new Error('RUT ya está registrado');
  } else if (emailDuplicado) {
    throw new Error('email ya está registrado');
  }

  // 1. Crear usuario en Auth usando una app secundaria para no cerrar la sesión del admin
  const appSecundaria = initializeApp(firebaseConfig, `crear-empleado-${Date.now()}`);
  const authSecundaria = getAuth(appSecundaria);
  const credencial = await createUserWithEmailAndPassword(
    authSecundaria,
    datosFormulario.email,
    passwordTemporal,
  );
  const uid = credencial.user.uid;
  await deleteApp(appSecundaria); // limpiar la app secundaria

  // 2. Enviar email para que el empleado establezca su contraseña (también activa la cuenta)
  await sendPasswordResetEmail(auth, datosFormulario.email);

  // 3. Guardar datos en Firestore usando el UID como id del documento
  const empleado = new EmpleadoModel({ ...datosFormulario, id: uid });
  await setDoc(empleadoDocRef(uid), empleado.toFirebase());

  return uid;
}

/**
 * Actualiza los datos de un empleado existente.
 * El historial vive en la colección externa historialPersonal, así que este
 * update nunca lo toca.
 *
 * @param {string} firebaseKey
 * @param {object} datosFormulario
 */
export async function actualizarEmpleado(firebaseKey, datosFormulario) {
  const empleado = new EmpleadoModel(datosFormulario);
  const payload  = empleado.toFirebase();

  await updateDoc(empleadoDocRef(firebaseKey), payload);
}

/**
 * Activa o desactiva un empleado.
 * @param {string}  firebaseKey
 * @param {boolean} nuevoEstado
 */
export async function toggleActivoEmpleado(firebaseKey, nuevoEstado) {
  await updateDoc(empleadoDocRef(firebaseKey), {
    activo: nuevoEstado,
  });
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

/**
 * Suscribe a cambios en tiempo real de la colección /usuarios.
 * Retorna función para cancelar la suscripción.
 *
 * @param {function} callback - Recibe EmpleadoModel[]
 * @returns {function}
 */
export function suscribirPersonal(callback) {
  return onSnapshot(empleadosColRef(), (snap) => {
    const empleados = snap.docs.map(docSnap =>
      EmpleadoModel.fromFirebase(docSnap.id, docSnap.data())
    );
    callback(empleados);
  });
}

// ─── Historial de sesiones ────────────────────────────────────────────────────

/**
 * Registra una entrada (inicio de turno).
 * @param {string} firebaseKey
 * @param {string} turno - 'dia' | 'noche'
 */
export async function registrarEntrada(firebaseKey, turno) {
  await addDoc(historialColRef(), {
    empleadoId: firebaseKey,
    entrada:    obtenerFechaHoraCL(),
    salida:     null,
    turno,
  });

  // `ultimaConexion` es parte del sistema de presencia (junto a `sesionActiva`).
  // Antes vivía en Realtime Database por el onDisconnect() del servidor; con
  // presencia por heartbeat puro ya no hace falta un storage separado, así
  // que ahora es solo otro campo del documento del empleado en Firestore.
  await updateDoc(empleadoDocRef(firebaseKey), {
    ultimaConexion: new Date().toISOString(),
  });
}

/**
 * Registra la salida en el registro pendiente (el más reciente sin salida).
 * @param {string} firebaseKey
 */
export async function registrarSalida(firebaseKey) {
  const qHistorial = query(historialColRef(), where('empleadoId', '==', firebaseKey));
  const snap = await getDocs(qHistorial);
  if (snap.empty) return;

  let keyPendiente = null;
  snap.forEach(docSnap => {
    const val = docSnap.data();
    if (!val.salida) keyPendiente = docSnap.id;
  });
  if (!keyPendiente) return;

  await updateDoc(doc(db, NODO_HISTORIAL, keyPendiente), {
    salida: obtenerFechaHoraCL(),
  });
}

/**
 * Obtiene una sola vez el historial de un empleado (colección externa historialPersonal).
 * @param {string} firebaseKey
 * @returns {Promise<Array<{id: string, entrada: string, salida: string|null, turno: string}>>}
 */
export async function obtenerHistorialEmpleado(firebaseKey) {
  const qHistorial = query(historialColRef(), where('empleadoId', '==', firebaseKey));
  const snap = await getDocs(qHistorial);
  if (snap.empty) return [];

  return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

/**
 * Suscribe en tiempo real al historial de un empleado (colección externa historialPersonal).
 * Retorna función para cancelar la suscripción.
 *
 * @param {string} firebaseKey
 * @param {function} callback - Recibe array de registros de historial
 * @returns {function}
 */
export function suscribirHistorialEmpleado(firebaseKey, callback) {
  const qHistorial = query(historialColRef(), where('empleadoId', '==', firebaseKey));

  return onSnapshot(qHistorial, (snap) => {
    const historial = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    callback(historial);
  });
}
