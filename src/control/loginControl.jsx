// control/loginControl.js
// Capa entre LoginScreen y AuthControl — traduce errores y valida inputs.

import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';
import { auth, rtdb } from '../firebaseConfig';
import { loginEmpleado, logoutEmpleado } from './AuthControl';
import { EmpleadoModel } from '../models/EmpleadoModel';

/**
 * Valida, autentica y retorna un EmpleadoModel.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<EmpleadoModel>}
 */
export async function loginUsuario(email, password) {
  if (!email.trim())  throw new Error('Ingresa tu correo electrónico.');
  if (!password)      throw new Error('Ingresa tu contraseña.');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) throw new Error('El correo no tiene un formato válido.');

  try {
    const datos = await loginEmpleado(email.trim(), password);
    return EmpleadoModel.fromFirebase(datos.uid, datos);
  } catch (err) {
    throw new Error(traducirError(err));
  }
}

/**
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function loginConGoogle() {
  let credencial;
  try {
    const provider = new GoogleAuthProvider();
    credencial = await signInWithPopup(auth, provider);
  } catch (err) {
    throw new Error(traducirError(err));
  }

  const email = credencial.user.email;

  try {
    const existeEnPersonal = await existeUsuarioConEmail('usuarios', email);
    const existeEnUsuarios = existeEnPersonal
      ? true
      : await existeUsuarioConEmail('usuarios', email);

    if (!existeEnPersonal && !existeEnUsuarios) {
      await signOut(auth);
      throw new Error('No existe una cuenta registrada con ese correo. Contacta a un administrador.');
    }

    return credencial.user;
  } catch (err) {
    // Si ya cerramos sesión y lanzamos nuestro propio error, lo re-lanzamos tal cual
    if (err.message?.includes('No existe una cuenta registrada')) throw err;
    await signOut(auth).catch(() => {});
    throw new Error('No se pudo verificar la cuenta. Intenta de nuevo.');
  }
}

/**
 * @param {string} nodo
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function existeUsuarioConEmail(nodo, email) {
  const q = query(ref(rtdb, nodo), orderByChild('email'), equalTo(email));
  const snap = await get(q);
  return snap.exists();
}

/**
 * Cierra sesión registrando la salida en el historial.
 * @returns {Promise<void>}
 */
export async function cerrarSesion() {
  try {
    await logoutEmpleado();
  } catch (err) {
    throw new Error('No se pudo cerrar la sesión. Intenta de nuevo.');
  }
}

/** Traduce códigos de Firebase Auth a mensajes en español. */
function traducirError(err) {
  const mapa = {
    'auth/invalid-email':          'El correo no es válido.',
    'auth/user-disabled':          'Esta cuenta ha sido deshabilitada.',
    'auth/user-not-found':         'No existe una cuenta con ese correo.',
    'auth/wrong-password':         'Contraseña incorrecta.',
    'auth/invalid-credential':     'Correo o contraseña incorrectos.',
    'auth/too-many-requests':      'Demasiados intentos. Espera un momento e intenta de nuevo.',
    'auth/network-request-failed': 'Sin conexión a internet. Verifica tu red.',
    'auth/popup-closed-by-user':   'Cerraste la ventana de Google antes de completar el inicio de sesión.',
    'auth/cancelled-popup-request':'Ya hay una ventana de Google abierta. Intenta de nuevo.',
    'auth/popup-blocked':          'El navegador bloqueó la ventana emergente. Habilita popups para este sitio.',
  };

  return mapa[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}