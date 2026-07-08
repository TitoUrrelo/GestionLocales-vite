import { ref, push, get, update, onValue, off } from 'firebase/database';
import { rtdb } from '../firebaseConfig';
import {
  ProveedorModel, validarProveedorGlobal, validarDatosContacto, validarDias, limpiarTelefono,
} from '../models/ProveedorModel';
import { rutaProveedores, rutaProveedorAsignado, rutaProveedorGlobal, NODO_PROVEEDOR } from '../models/LocalModel';

const NODO_LOCALES = 'locales';

class ProveedorInvalidoError extends Error {
  constructor(errores) {
    super('Datos de proveedor inválidos');
    this.errores = errores;
  }
}

/**
 * @param {object} datos
 * @param {string} datos.nombre
 * @param {string} datos.empresa
 * @param {string} datos.telefono
 * @returns {Promise<{id: string, nombre: string, empresa: string, telefono: string}>}
 */
export async function crearProveedorGlobal({ nombre, empresa, telefono }) {
  const errores = validarProveedorGlobal({ nombre, empresa, telefono });
  if (Object.keys(errores).length > 0) throw new ProveedorInvalidoError(errores);

  const nuevoRef = push(ref(rtdb, NODO_PROVEEDOR));
  const id = nuevoRef.key;
  const datos = { nombre: nombre.trim(), empresa: empresa.trim(), telefono: limpiarTelefono(telefono) };
  await update(nuevoRef, datos);

  return { id, ...datos };
}

/**
 * @param {string} id
 * @param {{nombre: string, telefono: string}} datos
 */
export async function actualizarProveedorGlobal(id, { nombre, telefono }) {
  const errores = validarDatosContacto({ nombre, telefono });
  if (Object.keys(errores).length > 0) throw new ProveedorInvalidoError(errores);

  await update(ref(rtdb, rutaProveedorGlobal(id)), {
    nombre: nombre.trim(),
    telefono: limpiarTelefono(telefono),
  });
}

/**
 * Obtiene (una vez) todos los proveedores del nodo global
 * @returns {Promise<Array<{id: string, nombre: string, empresa: string, telefono: string}>>}
 */
export async function obtenerProveedoresGlobales() {
  const snap = await get(ref(rtdb, NODO_PROVEEDOR));
  if (!snap.exists()) return [];
  const lista = [];
  snap.forEach(child => lista.push({ id: child.key, ...child.val() }));
  return lista;
}

/**
 * @param {function} callback 
 * @returns {function}
 */
export function suscribirProveedoresGlobales(callback) {
  const provRef = ref(rtdb, NODO_PROVEEDOR);
  const listener = onValue(provRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const lista = [];
    snap.forEach(child => lista.push({ id: child.key, ...child.val() }));
    callback(lista);
  });
  return () => off(provRef, 'value', listener);
}

/**
 * @param {string} local
 * @returns {Promise<Array<{id: string, nombre: string, empresa: string, telefono: string}>>}
 */
export async function obtenerProveedoresGlobalesDisponibles(local) {
  const [globalSnap, asignSnap] = await Promise.all([
    get(ref(rtdb, NODO_PROVEEDOR)),
    get(ref(rtdb, rutaProveedores(local))),
  ]);
  if (!globalSnap.exists()) return [];

  const yaAsignados = asignSnap.exists() ? Object.keys(asignSnap.val()) : [];
  const lista = [];
  globalSnap.forEach(child => {
    if (!yaAsignados.includes(child.key)) {
      lista.push({ id: child.key, ...child.val() });
    }
  });
  return lista;
}

/**
 * Asigna un proveedor YA EXISTENTE (nodo global) a un local
 * @param {string} local
 * @param {string} i
 * @param {number[]} dias
 * @param {boolean} [activo]
 */
export async function asignarProveedorExistenteALocal(local, id, dias, activo = true) {
  if (!validarDias(dias)) {
    throw new ProveedorInvalidoError({ dias: 'Selecciona al menos un día de visita' });
  }
  const proveedorTemp = new ProveedorModel({ id, dias, activo });
  await update(ref(rtdb, rutaProveedorAsignado(local, id)), proveedorTemp.toFirebaseAsignacion());
}

/**
 * Actualiza SOLO los días de visita de la asignación de un proveedor a un local puntual
 * @param {string} local
 * @param {string} id
 * @param {number[]} dias
 */
export async function actualizarDiasProveedorLocal(local, id, dias) {
  if (!validarDias(dias)) {
    throw new ProveedorInvalidoError({ dias: 'Selecciona al menos un día de visita' });
  }
  const proveedorTemp = new ProveedorModel({ id, dias });
  await update(ref(rtdb, rutaProveedorAsignado(local, id)), { dias: proveedorTemp.toFirebaseAsignacion().dias });
}

/**
 * Activa o desactiva un proveedor PARA UN LOCAL puntual
 * @param {string} local
 * @param {string} id
 * @param {boolean} activo
 */
export async function cambiarEstadoProveedor(local, id, activo) {
  await update(ref(rtdb, rutaProveedorAsignado(local, id)), { activo });
}

/**
 * Obtiene los proveedores asignados a un local
 * @param {string} local
 * @returns {Promise<ProveedorModel[]>}
 */
export async function obtenerProveedoresPorLocal(local) {
  const asignSnap = await get(ref(rtdb, rutaProveedores(local)));
  if (!asignSnap.exists()) return [];

  const entradas = [];
  asignSnap.forEach(child => {
    entradas.push({ id: child.key, asignacion: child.val() });
  });

  const datosProveedores = await Promise.all(
    entradas.map(({ id }) => get(ref(rtdb, rutaProveedorGlobal(id))))
  );

  return entradas.map(({ id, asignacion }, i) => {
    const datosProveedor = datosProveedores[i].exists() ? datosProveedores[i].val() : {};
    return ProveedorModel.fromFirebase(local, id, datosProveedor, asignacion);
  });
}

/**
 * Suscribe en tiempo real a los proveedores de un local
 * @param {string} local
 * @param {function} callback
 * @returns {function}
 */
export function suscribirProveedoresPorLocal(local, callback) {
  const asignRef = ref(rtdb, rutaProveedores(local));
  const provRef = ref(rtdb, NODO_PROVEEDOR);

  let ultimasAsignaciones = null;
  let ultimosProveedores = null;

  const recalcular = () => {
    if (ultimasAsignaciones === null || ultimosProveedores === null) return;
    const lista = Object.entries(ultimasAsignaciones).map(([id, asignacion]) =>
      ProveedorModel.fromFirebase(local, id, ultimosProveedores[id] ?? {}, asignacion)
    );
    callback(lista);
  };

  const asignListener = onValue(asignRef, (snap) => {
    ultimasAsignaciones = snap.exists() ? snap.val() : {};
    recalcular();
  });

  const provListener = onValue(provRef, (snap) => {
    ultimosProveedores = snap.exists() ? snap.val() : {};
    recalcular();
  });

  return () => {
    off(asignRef, 'value', asignListener);
    off(provRef, 'value', provListener);
  };
}

/**
 * Suscribe en tiempo real a TODOS los proveedores, de TODOS los locales.
 * @param {function} callback
 * @returns {function}
 */
export function suscribirProveedores(callback) {
  const localesRef = ref(rtdb, NODO_LOCALES);
  const provRef = ref(rtdb, NODO_PROVEEDOR);

  let ultimosLocales = null;
  let ultimosProveedores = null;

  const recalcular = () => {
    if (ultimosLocales === null || ultimosProveedores === null) return;
    const lista = [];
    Object.entries(ultimosLocales).forEach(([local, datosLocal]) => {
      const asignaciones = datosLocal?.proveedores ?? {};
      Object.entries(asignaciones).forEach(([id, asignacion]) => {
        lista.push(ProveedorModel.fromFirebase(local, id, ultimosProveedores[id] ?? {}, asignacion));
      });
    });
    callback(lista);
  };

  const localesListener = onValue(localesRef, (snap) => {
    ultimosLocales = snap.exists() ? snap.val() : {};
    recalcular();
  });

  const provListener = onValue(provRef, (snap) => {
    ultimosProveedores = snap.exists() ? snap.val() : {};
    recalcular();
  });

  return () => {
    off(localesRef, 'value', localesListener);
    off(provRef, 'value', provListener);
  };
}