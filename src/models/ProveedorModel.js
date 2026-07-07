// models/ProveedorModel.js
// Representa un proveedor. Ahora la info del proveedor vive en un nodo
// GLOBAL, separada de su asignación a cada local (para poder reutilizar el
// mismo proveedor en varios locales sin duplicar nombre/empresa/teléfono).
//
// Estructura en RTDB:
//   proveedor/{id}/
//     nombre    -> nombre del contacto
//     empresa   -> nombre de la empresa (no editable una vez creado)
//     telefono  -> celular chileno: empieza en 9 y tiene 9 dígitos en total
//
//   locales/{local}/proveedores/{id}/
//     activo    -> boolean (activa/desactiva al proveedor PARA ESE local)
//     dias      -> objeto con los 7 días de la semana en boolean, ej:
//                  { lunes: true, martes: false, miercoles: true, ... }
//
// Un mismo {id} puede existir bajo varios locales/{local}/proveedores/{id},
// cada uno con su propio activo/dias (mismo proveedor, distinta agenda según
// el local). ProveedorModel representa siempre "este proveedor visto desde
// un local puntual": junta ambos nodos en un solo objeto para no romper a
// quienes ya consumen nombre/empresa/telefono/dias/activo como si fuera uno solo.

// Solo letras (con tildes/ñ) y espacios. Sin números ni caracteres especiales.
const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+(?:\s[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+)*$/;

// Celular chileno: 9 dígitos en total, el primero siempre "9".
const TELEFONO_REGEX = /^9\d{8}$/;

// Orden de días usado para mapear el índice (0=Lunes..6=Domingo) que sigue
// usando la UI, al objeto {lunes, martes, ...} que ahora se guarda en Firebase.
export const DIAS_SEMANA_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

/** true si el nombre de contacto no contiene números ni caracteres especiales. */
export function validarNombreContacto(nombre) {
  return NOMBRE_REGEX.test((nombre ?? '').trim());
}

/** true si el teléfono empieza en 9 y tiene 9 dígitos en total. */
export function validarTelefono(telefono) {
  return TELEFONO_REGEX.test(limpiarTelefono(telefono));
}

/** Quita espacios, guiones y el prefijo +56 si el usuario lo escribió. */
export function limpiarTelefono(telefono) {
  return (telefono ?? '').toString().replace(/[\s-]/g, '').replace(/^(\+?56)/, '');
}

/** true si hay al menos un día de visita seleccionado. */
export function validarDias(dias) {
  return Array.isArray(dias) && dias.length > 0;
}

/**
 * Convierte el arreglo de índices que usa la UI ([0, 2, 4]) al objeto con
 * los 7 días en boolean que ahora se guarda en Firebase. Siempre entrega
 * las 7 llaves, aunque el día esté en false.
 */
export function diasArrayToObjeto(dias = []) {
  const objeto = {};
  DIAS_SEMANA_KEYS.forEach((key, idx) => {
    objeto[key] = Array.isArray(dias) && dias.includes(idx);
  });
  return objeto;
}

/**
 * Convierte el objeto de días guardado en Firebase ({lunes: true, ...}) de
 * vuelta al arreglo de índices que usa la UI ([0, 2, ...]).
 * Acepta también el formato viejo (arreglo de índices) por compatibilidad
 * con datos que no se hayan migrado.
 */
export function diasObjetoToArray(diasObjeto) {
  if (Array.isArray(diasObjeto)) return diasObjeto; // dato viejo, ya viene como índices
  return DIAS_SEMANA_KEYS.reduce((acc, key, idx) => {
    if (diasObjeto?.[key]) acc.push(idx);
    return acc;
  }, []);
}

/** Iniciales a partir del nombre de contacto (máx. 2 letras). */
export function getInitials(nombre) {
  return (nombre ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();
}

/**
 * Valida los campos editables de un proveedor (nombre, teléfono, días).
 * @returns {object} mapa de errores; vacío si todo es válido.
 */
/**
 * Valida solo nombre + teléfono (los datos de contacto que hoy viven en
 * proveedor/{id}). Reutilizado tanto por la creación/edición global como,
 * antes, por el flujo combinado de crearProveedor/actualizarProveedor.
 */
export function validarDatosContacto({ nombre, telefono }) {
  const errores = {};

  if (!nombre || !nombre.trim()) {
    errores.nombre = 'El nombre es obligatorio';
  } else if (!validarNombreContacto(nombre)) {
    errores.nombre = 'El nombre no puede contener números ni caracteres especiales';
  }

  if (!telefono || !telefono.trim()) {
    errores.telefono = 'El teléfono es obligatorio';
  } else if (!validarTelefono(telefono)) {
    errores.telefono = 'Debe empezar en 9 y tener 9 dígitos en total (ej: 912345678)';
  }

  return errores;
}

/**
 * Valida los datos del proveedor GLOBAL (proveedor/{id}): nombre, empresa y
 * teléfono. No incluye días: esos viven en la asignación a un local.
 */
export function validarProveedorGlobal({ nombre, empresa, telefono }) {
  const errores = validarDatosContacto({ nombre, telefono });
  if (!empresa || !empresa.trim()) {
    errores.empresa = 'La empresa es obligatoria';
  }
  return errores;
}

/**
 * @deprecated Se mantiene por compatibilidad con el flujo viejo (crear
 * proveedor + asignarlo a un local en un solo paso). El flujo actual separa
 * la creación global (validarProveedorGlobal) de la asignación a un local
 * (validarDias).
 */
export function validarProveedor({ nombre, telefono, dias }) {
  const errores = validarDatosContacto({ nombre, telefono });

  if (!validarDias(dias)) {
    errores.dias = 'Selecciona al menos un día de visita';
  }

  return errores;
}

export class ProveedorModel {
  /**
   * @param {object} datos
   * @param {string} datos.id
   * @param {string} datos.nombre    - Nombre del contacto (vive en proveedor/{id})
   * @param {string} datos.empresa   - Nombre de la empresa (vive en proveedor/{id})
   * @param {string} datos.telefono  - Celular, formato "9XXXXXXXX" (vive en proveedor/{id})
   * @param {number[]} datos.dias    - Índices de días de visita (0=Lunes..6=Domingo),
   *                                   vive como objeto en locales/{local}/proveedores/{id}/dias
   * @param {string[]} datos.locales - Locales que abastece (esta instancia representa
   *                                   siempre la vista desde UN local puntual)
   * @param {boolean} datos.activo   - vive en locales/{local}/proveedores/{id}/activo
   */
  constructor({
    id = '',
    nombre = '',
    empresa = '',
    telefono = '',
    dias = [],
    locales = [],
    activo = true,
  } = {}) {
    this.id = id;
    this.nombre = nombre;
    this.empresa = empresa;
    this.telefono = telefono;
    this.dias = dias;
    this.locales = locales;
    this.activo = activo;
  }

  /** Iniciales derivadas del nombre (compatibilidad con las tarjetas existentes). */
  get initials() {
    return getInitials(this.nombre);
  }

  /** Alias de empresa, usado por algunas tarjetas existentes como "tipo". */
  get tipo() {
    return this.empresa;
  }

  /** Datos propios del proveedor a persistir en proveedor/{id}. */
  toFirebaseProveedor() {
    return {
      nombre: this.nombre,
      empresa: this.empresa,
      telefono: this.telefono,
    };
  }

  /** Datos de la asignación a persistir en locales/{local}/proveedores/{id}. */
  toFirebaseAsignacion() {
    return {
      activo: this.activo,
      dias: diasArrayToObjeto(this.dias),
    };
  }

  /**
   * @param {string} local            - Local desde el que se está mirando este proveedor
   * @param {string} id               - Key compartida entre proveedor/{id} y locales/{local}/proveedores/{id}
   * @param {object} datosProveedor   - Valor crudo de proveedor/{id}
   * @param {object} datosAsignacion  - Valor crudo de locales/{local}/proveedores/{id}
   * @returns {ProveedorModel}
   */
  static fromFirebase(local, id, datosProveedor = {}, datosAsignacion = {}) {
    return new ProveedorModel({
      id,
      nombre: datosProveedor?.nombre ?? '',
      empresa: datosProveedor?.empresa ?? '',
      telefono: datosProveedor?.telefono ?? '',
      dias: diasObjetoToArray(datosAsignacion?.dias),
      locales: [local],
      activo: datosAsignacion?.activo ?? true,
    });
  }
}