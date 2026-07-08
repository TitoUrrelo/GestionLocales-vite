// control/ProveedorControl.js
// CRUD de proveedores, separado en dos flujos independientes:
//   proveedor/{id}                        -> nombre, empresa, telefono (GLOBAL)
//   locales/{local}/proveedores/{id}       -> activo, dias (ASIGNACIÓN a ese local)
//
// Flujo "Gestión de proveedores" (botón del sidebar/drawer, fuera de un local):
//   crearProveedorGlobal, actualizarProveedorGlobal, obtenerProveedoresGlobales,
//   suscribirProveedoresGlobales.
//
// Flujo "Proveedores de {local}" (botón del desplegable de cada local):
//   obtenerProveedoresGlobalesDisponibles (para elegir a quién asignar),
//   asignarProveedorExistenteALocal (alta de la asignación),
//   actualizarDiasProveedorLocal + cambiarEstadoProveedor (edición: solo
//   días y activo/inactivo — nombre/empresa/telefono NO se editan acá).
//
// Lectura combinada (usada por el resto de la app: tarjetas, calendario,
// KPIs, modal de detalle): obtenerProveedoresPorLocal, suscribirProveedoresPorLocal,
// suscribirProveedores — siguen entregando el mismo ProveedorModel de siempre
// (nombre/empresa/telefono/dias/activo juntos), aunque por dentro ahora
// combinen dos colecciones de Firestore en vez de dos nodos de RTDB.
//
// Las referencias se arman siempre desde models/LocalModel.js.
//
// OJO — collectionGroup: suscribirProveedores() usa una collectionGroup query
// sobre 'proveedores' para escuchar la subcolección de TODOS los locales a la
// vez. Para que funcione hace falta que las reglas de seguridad de Firestore
// permitan esa lectura vía un match con `{path=**}`, por ejemplo:
//   match /{path=**}/proveedores/{id} { allow read: if <tu condición>; }

import {
  doc, setDoc, getDoc, getDocs, updateDoc,
  onSnapshot, collectionGroup,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  ProveedorModel, validarProveedorGlobal, validarDatosContacto, validarDias, limpiarTelefono,
} from '../models/ProveedorModel';
import {
  proveedoresColRef, proveedorAsignadoDocRef, proveedorGlobalDocRef, proveedorGlobalColRef,
} from '../models/LocalModel';

/** Error con el mapa de validación adjunto, para que la UI pinte cada campo. */
class ProveedorInvalidoError extends Error {
  constructor(errores) {
    super('Datos de proveedor inválidos');
    this.errores = errores;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Colección GLOBAL (proveedor/{id}): nombre, empresa, teléfono.
// No sabe nada de locales, activo ni días — eso es responsabilidad de la
// asignación (ver más abajo). Este bloque es el que usa el botón del
// sidebar/drawer ("Gestión de proveedores"), fuera del contexto de un local.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Crea un proveedor en la colección GLOBAL (proveedor/{id}), sin asignarlo
 * todavía a ningún local. Para que aparezca en un local hay que asignarlo
 * después con asignarProveedorExistenteALocal.
 * @param {object} datos
 * @param {string} datos.nombre
 * @param {string} datos.empresa
 * @param {string} datos.telefono
 * @returns {Promise<{id: string, nombre: string, empresa: string, telefono: string}>}
 */
export async function crearProveedorGlobal({ nombre, empresa, telefono }) {
  const errores = validarProveedorGlobal({ nombre, empresa, telefono });
  if (Object.keys(errores).length > 0) throw new ProveedorInvalidoError(errores);

  const nuevoRef = doc(proveedorGlobalColRef());
  const id = nuevoRef.id;
  const datos = { nombre: nombre.trim(), empresa: empresa.trim(), telefono: limpiarTelefono(telefono) };
  await setDoc(nuevoRef, datos);

  return { id, ...datos };
}

/**
 * Actualiza nombre / teléfono de un proveedor en la colección GLOBAL. La
 * empresa no es editable una vez creado el proveedor (a propósito).
 * @param {string} id
 * @param {{nombre: string, telefono: string}} datos
 */
export async function actualizarProveedorGlobal(id, { nombre, telefono }) {
  const errores = validarDatosContacto({ nombre, telefono });
  if (Object.keys(errores).length > 0) throw new ProveedorInvalidoError(errores);

  await updateDoc(proveedorGlobalDocRef(id), {
    nombre: nombre.trim(),
    telefono: limpiarTelefono(telefono),
  });
}

/**
 * Obtiene (una vez) todos los proveedores de la colección global, sin
 * importar si están o no asignados a algún local.
 * @returns {Promise<Array<{id: string, nombre: string, empresa: string, telefono: string}>>}
 */
export async function obtenerProveedoresGlobales() {
  const snap = await getDocs(proveedorGlobalColRef());
  return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

/**
 * Suscribe en tiempo real a todos los proveedores de la colección global.
 * @param {function} callback - Recibe Array<{id, nombre, empresa, telefono}>
 * @returns {function} para cancelar la suscripción
 */
export function suscribirProveedoresGlobales(callback) {
  return onSnapshot(proveedorGlobalColRef(), (snap) => {
    callback(snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
  });
}

/**
 * Proveedores globales que TODAVÍA NO están asignados a un local puntual.
 * Es lo que alimenta el selector del formulario "asignar proveedor" de ese local.
 * @param {string} local
 * @returns {Promise<Array<{id: string, nombre: string, empresa: string, telefono: string}>>}
 */
export async function obtenerProveedoresGlobalesDisponibles(local) {
  const [globalSnap, asignSnap] = await Promise.all([
    getDocs(proveedorGlobalColRef()),
    getDocs(proveedoresColRef(local)),
  ]);
  if (globalSnap.empty) return [];

  const yaAsignados = new Set(asignSnap.docs.map(d => d.id));
  return globalSnap.docs
    .filter(docSnap => !yaAsignados.has(docSnap.id))
    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

// ─────────────────────────────────────────────────────────────────────────
// Asignación a un LOCAL (locales/{local}/proveedores/{id}): activo, dias.
// Este bloque es el que usa el botón "Proveedores" del desplegable de cada
// local: elegir un proveedor global y asignarle días; luego, en "Editar",
// solo se puede tocar días y activo/inactivo (nombre/empresa/telefono se
// editan desde la colección global, no acá).
// ─────────────────────────────────────────────────────────────────────────

/**
 * Asigna un proveedor YA EXISTENTE (colección global) a un local, con sus
 * días de visita para ESE local. Si el proveedor ya estaba asignado a otros
 * locales, no se duplican sus datos de contacto: solo se agrega esta asignación.
 * @param {string} local        - Local al que se quiere asignar
 * @param {string} id           - Id del proveedor (proveedor/{id})
 * @param {number[]} dias       - Días de visita para ESTE local
 * @param {boolean} [activo]    - Estado inicial de la asignación (default: true)
 */
export async function asignarProveedorExistenteALocal(local, id, dias, activo = true) {
  if (!validarDias(dias)) {
    throw new ProveedorInvalidoError({ dias: 'Selecciona al menos un día de visita' });
  }
  const proveedorTemp = new ProveedorModel({ id, dias, activo });
  await setDoc(proveedorAsignadoDocRef(local, id), proveedorTemp.toFirebaseAsignacion(), { merge: true });
}

/**
 * Actualiza SOLO los días de visita de la asignación de un proveedor a un
 * local puntual. No toca nombre/empresa/telefono (viven en la colección
 * global) ni activo (ver cambiarEstadoProveedor).
 * @param {string} local
 * @param {string} id
 * @param {number[]} dias
 */
export async function actualizarDiasProveedorLocal(local, id, dias) {
  if (!validarDias(dias)) {
    throw new ProveedorInvalidoError({ dias: 'Selecciona al menos un día de visita' });
  }
  const proveedorTemp = new ProveedorModel({ id, dias });
  await updateDoc(proveedorAsignadoDocRef(local, id), { dias: proveedorTemp.toFirebaseAsignacion().dias });
}

/**
 * Activa o desactiva un proveedor PARA UN LOCAL puntual, sin tocar sus datos
 * de contacto ni su estado en otros locales donde también esté asignado.
 * @param {string} local - Local del que cuelga la asignación
 * @param {string} id
 * @param {boolean} activo
 */
export async function cambiarEstadoProveedor(local, id, activo) {
  await updateDoc(proveedorAsignadoDocRef(local, id), { activo });
}

/**
 * Obtiene (una vez, sin suscripción) los proveedores asignados a un local,
 * combinando su asignación (activo/dias) con sus datos globales (nombre/
 * empresa/telefono).
 * @param {string} local
 * @returns {Promise<ProveedorModel[]>}
 */
export async function obtenerProveedoresPorLocal(local) {
  const asignSnap = await getDocs(proveedoresColRef(local));
  if (asignSnap.empty) return [];

  const entradas = asignSnap.docs.map(docSnap => ({ id: docSnap.id, asignacion: docSnap.data() }));

  const datosProveedores = await Promise.all(
    entradas.map(({ id }) => getDoc(proveedorGlobalDocRef(id)))
  );

  return entradas.map(({ id, asignacion }, i) => {
    const datosProveedor = datosProveedores[i].exists() ? datosProveedores[i].data() : {};
    return ProveedorModel.fromFirebase(local, id, datosProveedor, asignacion);
  });
}

/**
 * Suscribe en tiempo real a los proveedores de un local. Escucha tanto la
 * asignación local (locales/{local}/proveedores) como la colección global
 * (proveedor), y recalcula la lista combinada cuando cualquiera de las dos
 * cambia.
 * @param {string} local
 * @param {function} callback - Recibe ProveedorModel[]
 * @returns {function} para cancelar la suscripción
 */
export function suscribirProveedoresPorLocal(local, callback) {
  let ultimasAsignaciones = null;
  let ultimosProveedores = null;

  const recalcular = () => {
    if (ultimasAsignaciones === null || ultimosProveedores === null) return;
    const lista = Object.entries(ultimasAsignaciones).map(([id, asignacion]) =>
      ProveedorModel.fromFirebase(local, id, ultimosProveedores[id] ?? {}, asignacion)
    );
    callback(lista);
  };

  const unsubAsign = onSnapshot(proveedoresColRef(local), (snap) => {
    const mapa = {};
    snap.forEach(docSnap => { mapa[docSnap.id] = docSnap.data(); });
    ultimasAsignaciones = mapa;
    recalcular();
  });

  const unsubProv = onSnapshot(proveedorGlobalColRef(), (snap) => {
    const mapa = {};
    snap.forEach(docSnap => { mapa[docSnap.id] = docSnap.data(); });
    ultimosProveedores = mapa;
    recalcular();
  });

  return () => {
    unsubAsign();
    unsubProv();
  };
}

/**
 * Suscribe en tiempo real a TODOS los proveedores, de TODOS los locales.
 * Si un proveedor está asignado a más de un local, aparece una vez por cada
 * local (mismo id, distinto activo/dias posiblemente). Útil para pantallas
 * que necesitan la lista completa (ej. KPIs globales).
 *
 * Usa una collectionGroup query sobre 'proveedores' para escuchar todas las
 * subcolecciones locales/*\/proveedores en un solo listener (equivalente a lo
 * que antes hacía RTDB recorriendo el nodo locales completo).
 * @param {function} callback - Recibe ProveedorModel[]
 * @returns {function} para cancelar la suscripción
 */
export function suscribirProveedores(callback) {
  let ultimasAsignaciones = null; // { [local]: { [id]: asignacion } }
  let ultimosProveedores = null;  // { [id]: datosGlobales }

  const recalcular = () => {
    if (ultimasAsignaciones === null || ultimosProveedores === null) return;
    const lista = [];
    Object.entries(ultimasAsignaciones).forEach(([local, asignaciones]) => {
      Object.entries(asignaciones).forEach(([id, asignacion]) => {
        lista.push(ProveedorModel.fromFirebase(local, id, ultimosProveedores[id] ?? {}, asignacion));
      });
    });
    callback(lista);
  };

  const unsubAsign = onSnapshot(collectionGroup(db, 'proveedores'), (snap) => {
    const porLocal = {};
    snap.forEach(docSnap => {
      // locales/{local}/proveedores/{id} → el local es el abuelo del doc.
      const local = docSnap.ref.parent.parent.id;
      if (!porLocal[local]) porLocal[local] = {};
      porLocal[local][docSnap.id] = docSnap.data();
    });
    ultimasAsignaciones = porLocal;
    recalcular();
  });

  const unsubProv = onSnapshot(proveedorGlobalColRef(), (snap) => {
    const mapa = {};
    snap.forEach(docSnap => { mapa[docSnap.id] = docSnap.data(); });
    ultimosProveedores = mapa;
    recalcular();
  });

  return () => {
    unsubAsign();
    unsubProv();
  };
}
