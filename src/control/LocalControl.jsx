import { ref, get, update, onValue, off } from 'firebase/database';
import { rtdb } from '../firebaseConfig';
import {
  LocalModel,
  LOCAL_POR_DEFECTO,
  TIPOS_TURNO,
  validarTipoTurno,
  rutaLocal,
  rutaTurno,
} from '../models/LocalModel';

const NODO = 'locales';
export { LOCAL_POR_DEFECTO, TIPOS_TURNO };

/**
 * @param {string} nombreLocal
 * @returns {Promise<LocalModel>}
 */
export async function obtenerHorarioLocal(nombreLocal) {
  const snap = await get(ref(rtdb, rutaLocal(nombreLocal)));
  return LocalModel.fromFirebase(nombreLocal, snap.exists() ? snap.val() : {});
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
  await update(ref(rtdb, rutaTurno(nombreLocal, tipoTurno)), {
    hora_inicio: horario.hora_inicio,
    hora_fin: horario.hora_fin,
  });
}

/**
 * Suscribe a cambios en tiempo real de todos los locales.
 * @param {function} callback
 * @returns {function}
 */
export function suscribirLocales(callback) {
  const localesRef = ref(rtdb, NODO);

  const listener = onValue(localesRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const locales = [];
    snap.forEach(child => {
      locales.push(LocalModel.fromFirebase(child.key, child.val()));
    });
    callback(locales);
  });

  return () => off(localesRef, 'value', listener);
}