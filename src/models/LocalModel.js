// models/LocalModel.js
// Representa un local (ej: "cafeteria", "almacen", "comidaRapida") y todo lo
// que cuelga de él en Firestore. Estructura completa:
//   locales/{nombre}              (documento)
//     turnoDia:    { hora_inicio, hora_fin }   ← campos del documento
//     turnoNoche:  { hora_inicio, hora_fin }   ← campos del documento
//     proveedores/ (subcolección)  -> ver ProveedorModel.js
//     productos/   (subcolección)  -> aún sin modelo propio
//     recetas/     (subcolección)  -> aún sin modelo propio
//     ventas/      (subcolección)  -> aún sin modelo propio
//
// Las referencias de cada colección se arman siempre desde acá, para que
// todos los controls (LocalControl, ProveedorControl, y los que vengan de
// productos / recetas / ventas) usen el mismo esquema y no dupliquen strings
// de ruta. Antes esto eran simples strings (RTDB); ahora son DocumentReference
// / CollectionReference de Firestore, ya resueltas contra `db`.

import { doc, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const NODO_LOCALES = 'locales';

// Colección GLOBAL (fuera de /locales) donde vive la info propia de cada
// proveedor (nombre, empresa, teléfono). Es independiente del local:
// lo que cuelga de cada local (locales/{local}/proveedores/{id}) es solo
// la asignación de ese proveedor a ese local (activo + dias). Ver
// ProveedorModel.js para el detalle de ambos nodos.
export const NODO_PROVEEDOR = 'proveedor';

// Tipos de turno válidos, tal cual se guardan en Firestore.
export const TIPOS_TURNO = ['turnoDia', 'turnoNoche'];

// Nombres de local reconocidos hoy. Ajustar si se agrega/quita un local.
export const LOCALES_VALIDOS = ['cafeteria', 'almacen', 'comidaRapida'];

// Local usado como respaldo cuando un empleado no tiene ningún local asignado.
export const LOCAL_POR_DEFECTO = 'comidaRapida';

// Nombres de las subcolecciones que cuelgan de cada local (fuera de los turnos).
export const COLECCIONES_LOCAL = ['proveedores', 'productos', 'recetas', 'ventas'];

// ---------------------------------------------------------------------------
// Validaciones
// ---------------------------------------------------------------------------

/** true si el nombre de local es uno de los reconocidos. */
export function validarNombreLocal(nombre) {
  return LOCALES_VALIDOS.includes(nombre);
}

/** true si el tipo de turno es "turnoDia" o "turnoNoche". */
export function validarTipoTurno(tipoTurno) {
  return TIPOS_TURNO.includes(tipoTurno);
}

// ---------------------------------------------------------------------------
// Referencias de Firestore (centralizadas acá, no en los controls)
// ---------------------------------------------------------------------------

/** Ref al documento raíz de un local: locales/{local} */
export function localDocRef(local) {
  return doc(db, NODO_LOCALES, local);
}

/** Ref a la colección completa de locales: locales */
export function localesColRef() {
  return collection(db, NODO_LOCALES);
}

/** Ref genérico a cualquier subcolección anidada de un local. */
export function coleccionLocalRef(local, coleccion) {
  return collection(db, NODO_LOCALES, local, coleccion);
}

/**
 * Ref a las ASIGNACIONES de proveedor de un local: locales/{local}/proveedores
 * OJO: acá solo vive {activo, dias} por proveedor asignado. Los datos propios
 * del proveedor (nombre, empresa, telefono) están en proveedorGlobalDocRef(id).
 */
export function proveedoresColRef(local) {
  return coleccionLocalRef(local, 'proveedores');
}

/** Ref a la asignación de UN proveedor puntual dentro de un local. */
export function proveedorAsignadoDocRef(local, id) {
  return doc(db, NODO_LOCALES, local, 'proveedores', id);
}

/** Ref al documento global de un proveedor (fuera de /locales): proveedor/{id} */
export function proveedorGlobalDocRef(id) {
  return doc(db, NODO_PROVEEDOR, id);
}

/** Ref a la colección global de proveedores: proveedor */
export function proveedorGlobalColRef() {
  return collection(db, NODO_PROVEEDOR);
}

/** Ref a los productos de un local: locales/{local}/productos */
export function productosColRef(local) {
  return coleccionLocalRef(local, 'productos');
}

/** Ref a las recetas de un local: locales/{local}/recetas */
export function recetasColRef(local) {
  return coleccionLocalRef(local, 'recetas');
}

/** Ref a las ventas de un local: locales/{local}/ventas */
export function ventasColRef(local) {
  return coleccionLocalRef(local, 'ventas');
}

// ---------------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------------

/** Un turno individual (Día o Noche) con su hora_inicio / hora_fin. */
export class TurnoModel {
  /**
   * @param {object} datos
   * @param {string} datos.hora_inicio - Formato "HH:MM" (24hrs)
   * @param {string} datos.hora_fin    - Formato "HH:MM" (24hrs)
   */
  constructor({ hora_inicio = '08:00', hora_fin = '16:00' } = {}) {
    this.hora_inicio = hora_inicio;
    this.hora_fin = hora_fin;
  }

  /** Datos a persistir en Firebase. */
  toFirebase() {
    return {
      hora_inicio: this.hora_inicio,
      hora_fin: this.hora_fin,
    };
  }

  /**
   * @param {object} datos - Valor crudo desde Firebase (turnoDia o turnoNoche)
   * @returns {TurnoModel}
   */
  static fromFirebase(datos = {}) {
    return new TurnoModel({
      hora_inicio: datos?.hora_inicio ?? '08:00',
      hora_fin: datos?.hora_fin ?? '16:00',
    });
  }

  /** Convierte "HH:MM" a minutos desde medianoche. */
  static horaAMinutos(horaStr) {
    const [h, m] = (horaStr ?? '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /** Convierte minutos desde medianoche a "HH:MM" (con módulo de 24h). */
  static minutosAHora(minutos) {
    const m = ((minutos % 1440) + 1440) % 1440;
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  /**
   * Calcula la hora_fin a partir de una hora_inicio y una duración en horas
   * (admite decimales, ej. 7.5 = 7h 30min). Da la vuelta a medianoche si es necesario.
   */
  static calcularHoraFin(horaInicio, duracionHoras) {
    const inicioMin = TurnoModel.horaAMinutos(horaInicio);
    const finMin = inicioMin + Math.round(Number(duracionHoras || 0) * 60);
    return TurnoModel.minutosAHora(finMin);
  }

  inicioEnMinutos() {
    return TurnoModel.horaAMinutos(this.hora_inicio);
  }

  finEnMinutos() {
    return TurnoModel.horaAMinutos(this.hora_fin);
  }

  /** Duración del turno en horas (soporta turnos que cruzan medianoche). */
  duracionHoras() {
    const diff = (this.finEnMinutos() - this.inicioEnMinutos() + 1440) % 1440;
    return diff === 0 ? 24 : diff / 60;
  }

  /** true si el turno termina al día siguiente (ej. 16:00 -> 00:00). */
  cruzaMedianoche() {
    return this.finEnMinutos() <= this.inicioEnMinutos();
  }
}

/**
 * Un local (cafeteria, almacen, comidaRapida) con su turno Día y turno Noche.
 * Las demás colecciones del local (proveedores, productos, recetas, ventas)
 * NO se cargan acá: cada una tiene su propio model/control y se lee bajo
 * demanda usando las refs de arriba (proveedoresColRef, productosColRef, etc.),
 * igual que ProveedorModel hace con locales/{local}/proveedores.
 */
export class LocalModel {
  /**
   * @param {object} datos
   * @param {string} datos.nombre      - Id del local (ej: "cafeteria")
   * @param {TurnoModel} datos.turnoDia
   * @param {TurnoModel} datos.turnoNoche
   */
  constructor({
    nombre = '',
    turnoDia = new TurnoModel({ hora_inicio: '08:00', hora_fin: '16:00' }),
    turnoNoche = new TurnoModel({ hora_inicio: '16:00', hora_fin: '00:00' }),
  } = {}) {
    this.nombre = nombre;
    this.turnoDia = turnoDia;
    this.turnoNoche = turnoNoche;
  }

  /** @param {'turnoDia'|'turnoNoche'} tipo */
  getTurno(tipo) {
    return tipo === 'turnoNoche' ? this.turnoNoche : this.turnoDia;
  }

  /** Datos a persistir en Firebase. Solo turnoDia/turnoNoche: el resto de las
   * colecciones (proveedores, productos, recetas, ventas) se guardan por
   * separado, cada una con su propio toFirebase(). */
  toFirebase() {
    return {
      turnoDia: this.turnoDia.toFirebase(),
      turnoNoche: this.turnoNoche.toFirebase(),
    };
  }

  /**
   * @param {string} nombre - Id del documento en /locales
   * @param {object} datos  - Valor crudo desde Firebase (puede traer también
   *                           proveedores/productos/recetas/ventas, que se ignoran acá)
   * @returns {LocalModel}
   */
  static fromFirebase(nombre, datos = {}) {
    return new LocalModel({
      nombre,
      turnoDia: TurnoModel.fromFirebase(datos?.turnoDia),
      turnoNoche: TurnoModel.fromFirebase(datos?.turnoNoche),
    });
  }
}
