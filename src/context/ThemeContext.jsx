import { createContext, useContext, useState, useEffect } from 'react';

const light = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#FFFFFF',
  border: 'rgba(0,0,0,0.1)',
  textPrimary: '#1A1916',
  textSecondary: '#7A7670',
  placeholder: '#B0ADA8',
  accentText: '#185FA5',
  btnBg: '#1A1916',
  btnText: '#F4F2EE',
};

const dark = {
  bg: '#111210',
  surface: '#1C1D1B',
  surface2: '#252623',
  border: 'rgba(255,255,255,0.09)',
  textPrimary: '#EDEBE6',
  textSecondary: '#888680',
  placeholder: '#555450',
  accentText: '#7BB8E8',
  btnBg: '#EDEBE6',
  btnText: '#111210',
};

const ThemeContext = createContext({});

const STORAGE_KEY = '@theme_mode';

export function ThemeProvider({ children }) {
  // localStorage es síncrono, así que podemos leer el valor inicial
  // directamente en el useState en vez de esperar un efecto + loading.
  const [isDark, setIsDark] = useState(() => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return value !== null ? JSON.parse(value) : false;
    } catch (error) {
      console.log('Error cargando tema:', error);
      return false;
    }
  });

  // Guardar cada vez que cambie
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(isDark));
    } catch (error) {
      console.log('Error guardando tema:', error);
    }
  }, [isDark]);

  const toggle = () => {
    setIsDark(prev => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        colors: isDark ? dark : light,
        isDark,
        toggle,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);