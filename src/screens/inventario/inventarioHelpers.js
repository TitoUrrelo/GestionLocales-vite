// screens/inventario/inventarioHelpers.js
import { HOY_IDX } from './inventarioData';

export function getLevel(item) {
  const pct = item.qty / item.min;
  if (pct <= 0)   return 'out';
  if (pct <= 0.3) return 'critical';
  if (pct <= 1)   return 'low';
  return 'ok';
}

export function getPct(item) {
  return Math.min(100, Math.round((item.qty / item.max) * 100));
}

export function getVencLevel(dias) {
  if (dias <= 1) return 'critical';
  if (dias <= 3) return 'warning';
  return 'soon';
}

export function getInitials(nombre) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function nextVisitOffset(diasArr) {
  return Math.min(
    ...diasArr.map(dia => {
      let diff = dia - HOY_IDX;
      // Si la visita es hoy o ya pasó, corresponde a la siguiente semana
      if (diff <= 0) diff += 7;
      return diff;
    })
  );
}

export function formatHora(fecha) {
  return fecha;
}
