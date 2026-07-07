import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './control/AuthContext';

import LoginScreen              from './screens/LoginScreen';
//import ScreenGestion            from './screens/ScreenGestion';
//import ScreenGestionProductos   from './screens/ScreenGestionProductos';
import AlertasScreen            from './screens/AlertasScreen';
//import ScreenGestionRecetas     from './screens/ScreenGestionRecetas';
import Portal                   from './screens/Portal';

import { actualizarPresencia } from './control/AuthControl';

import './App.css';

// ── Registra presencia en cada cambio de ruta ────────────────────────────────
// Reemplaza al onStateChange={actualizarPresencia} de NavigationContainer.
function PresenciaListener() {
  const location = useLocation();

  useEffect(() => {
    actualizarPresencia();
  }, [location.pathname]);

  return null;
}

// ── Rutas ─────────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { usuario, cargando } = useAuth();

  // Mientras Firebase verifica si hay sesión activa
  if (cargando) {
    return (
      <div className="app-loading">
        <span className="app-spinner" aria-label="Cargando" />
      </div>
    );
  }

  return (
    <Routes>
      {!usuario ? (
        // ── Sin sesión ──────────────────────────────────────────────────────
        <>
          <Route path="/login"  element={<LoginScreen />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        // ── Con sesión ──────────────────────────────────────────────────────
        <>
          <Route path="/portal"                 element={<Portal />} />
          <Route path="/alertas"                element={<AlertasScreen />} />
          
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <PresenciaListener />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}