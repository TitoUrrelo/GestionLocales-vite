// screens/LocalesScreen.jsx
// Modal para configurar el horario de cada local. Se elige el local
// (cafetería / almacén / comida rápida) y el turno (Día / Noche); luego se
// ingresa la hora de inicio y cuántas horas dura el turno, y la hora de
// salida se calcula automáticamente.
//
// TODO: ajustar las rutas de import según donde guardes LocalControl / LocalModel.
import { useEffect, useState } from 'react';
import { obtenerHorarioLocal, actualizarTurnoLocal } from '../control/LocalControl';
import { TurnoModel } from '../models/LocalModel';
import '../css/LocalesScreen.css';

const LOCALES = [
  { key: 'cafeteria', label: 'Cafetería' },
  { key: 'almacen', label: 'Almacén' },
  { key: 'comidaRapida', label: 'Comida Rápida' },
];

const TURNOS = [
  { key: 'turnoDia', label: 'Turno Día' },
  { key: 'turnoNoche', label: 'Turno Noche' },
];

export default function LocalesScreen({ visible, onClose }) {
  const [localActivo, setLocalActivo] = useState(LOCALES[0].key);
  const [turnoActivo, setTurnoActivo] = useState(TURNOS[0].key);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [duracionHoras, setDuracionHoras] = useState(8);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!visible) return;
    let activo = true;
    setCargando(true);
    setMensaje('');
    obtenerHorarioLocal(localActivo)
      .then((modelo) => {
        if (!activo) return;
        const turno = modelo.getTurno(turnoActivo);
        setHoraInicio(turno.hora_inicio);
        setDuracionHoras(turno.duracionHoras());
      })
      .catch((err) => {
        console.error('Error al cargar horario del local:', err);
        setMensaje('No se pudo cargar el horario actual, se muestran valores por defecto.');
      })
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [visible, localActivo, turnoActivo]);

  if (!visible) return null;

  const horaFin = TurnoModel.calcularHoraFin(horaInicio, duracionHoras);
  const cruzaMedianoche =
    TurnoModel.horaAMinutos(horaInicio) + Math.round(Number(duracionHoras || 0) * 60) >= 1440;

  const handleDuracionChange = (e) => {
    const valor = e.target.value;
    if (valor === '') {
      setDuracionHoras('');
      return;
    }
    const num = Number(valor);
    if (!Number.isNaN(num)) {
      setDuracionHoras(num);
    }
  };

  const handleGuardar = async () => {
    const duracionValida = Number(duracionHoras);
    if (!duracionValida || duracionValida <= 0 || duracionValida > 24) {
      setMensaje('Ingresa una duración de turno válida (entre 0.5 y 24 horas).');
      return;
    }
    setGuardando(true);
    setMensaje('');
    try {
      await actualizarTurnoLocal(localActivo, turnoActivo, {
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      });
      setMensaje('Horario guardado correctamente.');
    } catch (err) {
      console.error('Error al guardar horario del local:', err);
      setMensaje('Ocurrió un error al guardar. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const localInfo = LOCALES.find((l) => l.key === localActivo);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card locales-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Horarios de locales</p>
            <h2>Configurar turno</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar" type="button">
            ×
          </button>
        </div>

        <div className="locales-tabs">
          {LOCALES.map((l) => (
            <button
              key={l.key}
              type="button"
              className={`locales-tab ${localActivo === l.key ? 'activo' : ''}`}
              onClick={() => setLocalActivo(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="turno-tabs">
          {TURNOS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`turno-tab ${turnoActivo === t.key ? 'activo' : ''}`}
              onClick={() => setTurnoActivo(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {cargando ? (
          <p className="hint">Cargando horario de {localInfo.label}...</p>
        ) : (
          <>
            <div className="form-grid">
              <div>
                <label htmlFor="hora-inicio">Hora de inicio</label>
                <input
                  id="hora-inicio"
                  type="time"
                  className="field"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="duracion">Duración del turno (horas)</label>
                <input
                  id="duracion"
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  className="field"
                  value={duracionHoras}
                  onChange={handleDuracionChange}
                />
              </div>
            </div>

            <div className="resumen-horario">
              <div className="resumen-item">
                <span>Entrada</span>
                <strong>{horaInicio}</strong>
              </div>
              <div className="resumen-flecha">→</div>
              <div className="resumen-item">
                <span>Salida{cruzaMedianoche ? ' (+1 día)' : ''}</span>
                <strong>{horaFin}</strong>
              </div>
            </div>

            {mensaje && <p className="hint">{mensaje}</p>}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose} type="button">
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando} type="button">
                {guardando ? 'Guardando...' : 'Guardar horario'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}