import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../control/AuthContext';

import {
  PROVEEDORES_INIT, RECETAS_DATA_INIT, PRODUCTOS_DATA_INIT, INVENTARIO_RECIENTE_INIT,
} from './inventario/inventarioData';
import DesktopLayout from './inventario/DesktopLayout';
import MobileLayout from './inventario/MobileLayout';

const DESKTOP_BREAKPOINT = 768;

// Hook simple para saber el ancho de la ventana (equivalente a useWindowDimensions de RN)
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export default function AlertasScreen() {
  const width = useWindowWidth();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  // localActivo y setLocalActivo vienen del contexto; se inicializan
  // automáticamente con el primer local asignado al usuario al hacer login.
  const { localActivo: activeLocal, setLocalActivo: setActiveLocal } = useAuth();
  const [modo,           setModo]           = useState('inventario');
  const [activeTab,      setActiveTab]      = useState('inventario');
  const [modalStock,     setModalStock]     = useState(null);
  const [modalVenc,      setModalVenc]      = useState(null);
  const [modalProv,      setModalProv]      = useState(null);
  const [modalNuevoProv, setModalNuevoProv] = useState(false);
  const [proveedores,    setProveedores]    = useState(PROVEEDORES_INIT);
  const [recetasData,    setRecetasData]    = useState(RECETAS_DATA_INIT);
  const [productosData,  setProductosData]  = useState(PRODUCTOS_DATA_INIT);
  const [inventarioReciente] = useState(INVENTARIO_RECIENTE_INIT);
  const [visitanHoyVisible,        setVisitanHoyVisible]        = useState(false);
  const [visitanHoyDismissedToday, setVisitanHoyDismissedToday] = useState(false);

  const handleGuardarProveedor = useCallback((nuevo) => {
    setProveedores(prev => [...prev, nuevo]);
  }, []);

  const state = {
    activeLocal, modo, activeTab, proveedores,
    modalStock, modalVenc, modalProv, modalNuevoProv,
    recetasData, productosData, inventarioReciente,
    visitanHoyVisible, visitanHoyDismissedToday,
  };
  const actions = {
    setActiveLocal, setModo, setActiveTab,
    setModalStock, setModalVenc, setModalProv, setModalNuevoProv,
    handleGuardarProveedor, setRecetasData, setProductosData,
    setVisitanHoyVisible, setVisitanHoyDismissedToday,
  };

  if (isDesktop) {
    return <DesktopLayout state={state} actions={actions} />;
  }
  return <MobileLayout state={state} actions={actions} />;
}
