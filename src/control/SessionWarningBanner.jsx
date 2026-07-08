// control/SessionWarningBanner.jsx
// Banner que aparece en cualquier pantalla cuando faltan ≤15 min de turno.
// Maneja su propio contador interno — no depende de minutosParaCierre en el contexto.
//
// Uso:
//   import SessionWarningBanner from '../control/SessionWarningBanner';
//   ...
//   return (
//     <div style={{ flex: 1 }}>
//       <SessionWarningBanner />
//       {/* resto de la pantalla */}
//     </div>
//   );

import { useEffect, useState } from 'react';
import { FiAlertCircle, FiClock } from 'react-icons/fi';
import { useAuth, minutosHastaFinTurno } from './AuthContext';
import { cerrarSesion } from './loginControl';

import '../css/SessionWarningBanner.css';

const UMBRAL = 15; // minutos antes del fin de turno en que aparece el banner

export default function SessionWarningBanner() {
  const { usuario } = useAuth();
  const [mins, setMins] = useState(null);

  // Calcular minutos restantes cada 30 segundos
  useEffect(() => {
    if (!usuario?.restriccionHorario || !usuario?.turno) {
      setMins(null);
      return;
    }

    function actualizar() {
      setMins(minutosHastaFinTurno(usuario.turno, usuario.horarioLocal)); // ← agregar horarioLocal
    }

    actualizar();
    const intervalo = setInterval(actualizar, 30 * 1000);
    return () => clearInterval(intervalo);
  }, [usuario?.uid, usuario?.restriccionHorario, usuario?.turno, usuario?.horarioLocal]); // ← agregar acá también

  const visible = mins !== null && mins <= UMBRAL && mins > 0;

  // No renderizar nada hasta que falten 15 min o menos
  if (!visible) return null;

  const esUrgente = mins !== null && mins <= 5;
  const Icono     = esUrgente ? FiAlertCircle : FiClock;

  const mensaje = mins <= 1
    ? 'Tu sesión se cerrará en menos de 1 minuto.'
    : `Tu sesión se cerrará automáticamente en ${mins} min.`;

  return (
    <div className={`swb-banner ${esUrgente ? 'swb-urgente' : 'swb-normal'}`}>
      <Icono size={16} className="swb-icon" />

      <div className="swb-textwrap">
        <p className="swb-titulo">{esUrgente ? '¡Turno terminando!' : 'Turno próximo a finalizar'}</p>
        <p className="swb-mensaje">{mensaje}</p>
      </div>

      <button
        type="button"
        className="swb-btn"
        onClick={() => cerrarSesion().catch(() => {})}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
