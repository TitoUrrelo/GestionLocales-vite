import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiMail, FiLock, FiEye, FiEyeOff, FiLogIn,
  FiMoon, FiSun, FiAlertCircle, FiCheckCircle, FiInfo, FiX,
} from 'react-icons/fi';
import { MdBolt } from 'react-icons/md';
import { FaGoogle } from 'react-icons/fa';

import { useTheme } from '../context/ThemeContext';
import { loginUsuario, loginConGoogle } from '../control/loginControl';

import '../css/LoginScreen.css';

// ── Toast flotante ────────────────────────────────────────────────────────────
const TIPOS = {
  error:   { icono: FiAlertCircle, className: 'toast-error'   },
  success: { icono: FiCheckCircle, className: 'toast-success' },
  info:    { icono: FiInfo,        className: 'toast-info'    },
};

function Toast({ toast, onOcultar }) {
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (!toast.visible) return;
    setSaliendo(false);

    // Auto-cierre a los 4 s
    const timer = setTimeout(() => salir(), 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.visible, toast.id]);

  function salir() {
    setSaliendo(true);
    // Espera a que termine la transición CSS antes de desmontar
    setTimeout(onOcultar, 200);
  }

  if (!toast.visible) return null;

  const tipo = TIPOS[toast.tipo] ?? TIPOS.error;
  const Icono = tipo.icono;

  return (
    <div className={`toast-wrap ${tipo.className} ${saliendo ? 'toast-exit' : 'toast-enter'}`}>
      <Icono size={18} className="toast-icon" />
      <div className="toast-body">
        {toast.titulo  ? <p className="toast-titulo">{toast.titulo}</p>   : null}
        {toast.mensaje ? <p className="toast-mensaje">{toast.mensaje}</p> : null}
      </div>
      <button type="button" className="toast-close" onClick={salir} aria-label="Cerrar">
        <FiX size={16} />
      </button>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const navigate = useNavigate();
  const { colors, isDark, toggle } = useTheme();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState({ visible: false, id: 0, tipo: 'error', titulo: '', mensaje: '' });

  function mostrarToast(tipo, titulo, mensaje) {
    setToast(prev => ({ visible: true, id: prev.id + 1, tipo, titulo, mensaje }));
  }

  function ocultarToast() {
    setToast(prev => ({ ...prev, visible: false }));
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    ocultarToast();
    try {
      setLoading(true);
      await loginUsuario(email, password);
      // AuthContext detecta la sesión y navega automáticamente
    } catch (err) {
      mostrarToast('error', 'Error al iniciar sesión', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    ocultarToast();
    try {
      setLoading(true);
      await loginConGoogle();
    } catch (err) {
      mostrarToast('error', 'Error con Google', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Variables CSS derivadas del theme, para que el CSS externo las use
  const themeVars = {
    '--c-bg': colors.bg,
    '--c-surface': colors.surface,
    '--c-surface2': colors.surface2,
    '--c-border': colors.border,
    '--c-textPrimary': colors.textPrimary,
    '--c-textSecondary': colors.textSecondary,
    '--c-placeholder': colors.placeholder,
    '--c-btnBg': colors.btnBg,
    '--c-btnText': colors.btnText,
    '--c-accentText': colors.accentText,
  };

  return (
    <div className="login-root" style={themeVars}>
      <div className="login-scroll">
        <div className="login-container">

          {/* Toggle tema */}
          <div className="login-topbar">
            <button type="button" className="toggle-btn" onClick={toggle}>
              {isDark ? <FiMoon size={14} className="toggle-icon" /> : <FiSun size={14} className="toggle-icon" />}
              <span className="toggle-text">{isDark ? 'Oscuro' : 'Claro'}</span>
            </button>
          </div>

          <div className="login-card">

            {/* Logo / ícono de app */}
            <div className="logo-wrap">
              <MdBolt size={26} color={colors.btnText} />
            </div>

            <h1 className="login-title">Bienvenido de nuevo</h1>
            <p className="login-subtitle">Inicia sesión para continuar</p>

            <form onSubmit={handleLogin}>
              {/* Email */}
              <label className="field-label" htmlFor="email">CORREO ELECTRÓNICO</label>
              <div className="input-wrap">
                <FiMail size={16} className="input-icon" />
                <input
                  id="email"
                  className="text-input"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                />
              </div>

              {/* Contraseña */}
              <label className="field-label field-label-spaced" htmlFor="password">CONTRASEÑA</label>
              <div className="input-wrap">
                <FiLock size={16} className="input-icon" />
                <input
                  id="password"
                  className="text-input input-with-eye"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPwd(p => !p)}
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPwd ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              {/* Olvidaste contraseña */}
              <div className="forgot-wrap">
                <button
                  type="button"
                  className="link-btn forgot-text"
                  onClick={() => navigate('/portal')}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Botón principal */}
              <button
                type="submit"
                className={`btn-primary ${loading ? 'btn-disabled' : ''}`}
                disabled={loading}
              >
                {loading
                  ? <span className="spinner" aria-label="Cargando" />
                  : (
                    <span className="btn-row">
                      <FiLogIn size={16} className="btn-icon" />
                      Iniciar sesión
                    </span>
                  )
                }
              </button>
            </form>

            {/* Divider */}
            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">o continúa con</span>
              <div className="divider-line" />
            </div>

            {/* Google */}
            <button
              type="button"
              className="btn-social"
              onClick={handleGoogle}
              disabled={loading}
            >
              <span className="btn-row">
                <FaGoogle size={18} className="btn-icon" color={colors.textPrimary} />
                Continuar con Google
              </span>
            </button>

          </div>
        </div>
      </div>

      {/* Toast flotante — fuera del scroll para que no se desplace */}
      <Toast toast={toast} onOcultar={ocultarToast} />
    </div>
  );
}