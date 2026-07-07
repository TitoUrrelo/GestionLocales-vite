import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PersonalModal from '../screens/PersonalScreen'; // TODO: ajustar la ruta según donde guardes PersonalScreen.jsx
import LocalesModal from '../screens/LocalesScreen'; // TODO: ajustar la ruta según donde guardes LocalesScreen.jsx
import { logoutEmpleado } from '../control/AuthControl'; // TODO: ajustar la ruta según donde guardes AuthControl.jsx
import { useAuth } from '../control/AuthContext';
import '../css/Portal.css';

function Portal() {
  const navigate = useNavigate();
  const [mostrarPersonal, setMostrarPersonal] = useState(false);
  const [mostrarLocales, setMostrarLocales] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const { usuario } = useAuth();

  // TODO: reemplazar por datos reales desde useAuth() (AuthContext)
  const nombreUsuario = 'Administrador';
  const nombreRol = 'Administrador';

  const irModuloVentas = () => {
    navigate('/admin'); // TODO: ajustar a la ruta real cuando exista
  };

  const irModuloInventario = () => {
    navigate('/alertas'); // Coincide con la <Route path="/alertas" element={<AlertasScreen />} /> de App.jsx
  };

  const handleSalir = async () => {
    if (saliendo) return; // evita doble click mientras se procesa
    setSaliendo(true);
    try {
      await logoutEmpleado();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      // Aunque falle el registro de salida/estado en la BD, igual sacamos al usuario
    } finally {
      setSaliendo(false);
      navigate('/login');
    }
  };

  return (
    <main className="portal-page">
      <section className="portal-shell">
        <div className="portal-header">
          <div>
            <p className="eyebrow">Panel principal</p>
            <h1>Sistema Integrado</h1>
            <p className="muted">
              Bienvenido/a, <b>{nombreUsuario}</b> ({nombreRol})
            </p>
          </div>
          <button className="btn btn-danger" onClick={handleSalir} disabled={saliendo}>
            {saliendo ? 'Saliendo...' : 'Salir'}
          </button>
        </div>

        <div className="action-grid">
          <button onClick={irModuloVentas} className="module-card module-green">
            <span className="module-icon">Caja</span>
            <strong>Panel admin</strong>
            <small>Ver resumen de ventas y control general.</small>
          </button>

          <button onClick={irModuloInventario} className="module-card module-blue">
            <span className="module-icon">Stock</span>
            <strong>Inventario</strong>
            <small>Consulta y control de productos.</small>
          </button>

          <button onClick={() => setMostrarPersonal(true)} className="module-card module-orange">
            <span className="module-icon">User</span>
            <strong>Crear usuarios</strong>
            <small>Alta rápida para admin, cajero o delivery.</small>
          </button>

          <button onClick={() => setMostrarLocales(true)} className="module-card module-purple">
            <span className="module-icon">Turno</span>
            <strong>Horarios de locales</strong>
            <small>Define entrada y salida de cafetería, almacén y comida rápida.</small>
          </button>
        </div>
      </section>

      {/* Modal de gestión de usuario (mismo componente que en PersonalScreen) */}
      <PersonalModal
        visible={mostrarPersonal}
        onClose={() => setMostrarPersonal(false)}
      />

      {/* Modal para configurar el horario fijo de cada local */}
      <LocalesModal
        visible={mostrarLocales}
        onClose={() => setMostrarLocales(false)}
      />
    </main>
  );
}

export default Portal;