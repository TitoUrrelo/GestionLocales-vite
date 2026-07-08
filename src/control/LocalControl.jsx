// control/LocalControl.js
// CRUD del horario fijo de cada local, separado en turnoDia y turnoNoche.
// Estructura en Firestore (ver models/LocalModel.js para el detalle completo,
// incluyendo proveedores / productos / recetas / ventas):
//   locales/{nombre}          (documento)
//     turnoDia:    { hora_inicio, hora_fin }
//     turnoNoche:  { hora_inicio, hora_fin }
//     proveedores/ (subcolección)

import { getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  LocalModel,
  LOCAL_POR_DEFECTO,
  TIPOS_TURNO,
  validarTipoTurno,
  localDocRef,
  localesColRef,
} from '../models/LocalModel';

// Re-exportados para no romper a quienes ya los importan desde el control.
export { LOCAL_POR_DEFECTO, TIPOS_TURNO };

/**
 * Obtiene los horarios (turnoDia y turnoNoche) configurados para un local.
 * Si el local no existe aún en la base de datos, retorna los valores por
 * defecto sin lanzar error, para no bloquear la carga inicial.
 * @param {string} nombreLocal
 * @returns {Promise<LocalModel>}
 */
export async function obtenerHorarioLocal(nombreLocal) {
  const snap = await getDoc(localDocRef(nombreLocal));
  return LocalModel.fromFirebase(nombreLocal, snap.exists() ? snap.data() : {});
}

/**
 * Actualiza hora_inicio / hora_fin de un turno específico (Día o Noche) de un local.
 * @param {string} nombreLocal
 * @param {'turnoDia'|'turnoNoche'} tipoTurno
 * @param {{hora_inicio: string, hora_fin: string}} horario
 */
export async function actualizarTurnoLocal(nombreLocal, tipoTurno, horario) {
  if (!validarTipoTurno(tipoTurno)) {
    throw new Error(`Tipo de turno inválido: ${tipoTurno}`);
  }
  // merge:true porque el documento del local puede no existir todavía y no
  // queremos pisar el otro turno (turnoDia/turnoNoche) que ya esté guardado.
  await setDoc(localDocRef(nombreLocal), {
    [tipoTurno]: {
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
    },
  }, { merge: true });
}

/**
 * Suscribe a cambios en tiempo real de todos los locales.
 * @param {function} callback - Recibe LocalModel[]
 * @returns {function} para cancelar la suscripción
 */
export function suscribirLocales(callback) {
  return onSnapshot(localesColRef(), (snap) => {
    if (snap.empty) {
      callback([]);
      return;
    }
    const locales = snap.docs.map(docSnap => LocalModel.fromFirebase(docSnap.id, docSnap.data()));
    callback(locales);
  });
}
