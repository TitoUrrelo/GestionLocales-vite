import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  PRODUCTOS_INICIALES, CATEGORIAS, TIPOS_MOVIMIENTO,
  getStockStatus, formatStock, requiereFechaVenc,
} from './gestionProductosData';
import {
  FiltroPickerModal, DetalleContenido, DetalleModal,
  EditarModal, ActualizarStockModal, RegistrarModal, TransferirModal,
} from './GestionProductosForms';
import '../../css/GestionProductos.css';

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

// ─── Tarjeta de producto ──────────────────────────────────────────────────────

function TarjetaProducto({ item, onClick }) {
  const status = getStockStatus(item.stock, item.minimo);
  const stockNum = item.unidad === 'g'
    ? (item.stock >= 1000 ? (item.stock / 1000).toFixed(1) : item.stock)
    : item.stock;
  const stockLbl = item.unidad === 'g' ? (item.stock >= 1000 ? 'kg' : 'g') : 'uds.';

  return (
    <button className={`gp-card${!item.activo ? ' inactivo' : ''}`} onClick={onClick}>
      <div className="gp-card-icon">{item.unidad === 'g' ? ' ' : ' '}</div>
      <div className="gp-card-info">
        <div className="gp-card-nombre">{item.nombre}</div>
        <div className="gp-card-codigo">{item.codigo}</div>
        {item.activo ? (
          <div className={`gp-badge gp-badge-${status}`}>
            {status === 'ok' ? 'Disponible' : status === 'low' ? 'Stock bajo' : 'Sin stock'}
          </div>
        ) : (
          <div className="gp-badge gp-badge-inactive">Inactivo</div>
        )}
      </div>
      <div className="gp-card-right">
        <div className="gp-stock-num">{stockNum}</div>
        <div className="gp-stock-lbl">{stockLbl}</div>
      </div>
    </button>
  );
}

function TarjetaProductoGrid({ item, onClick }) {
  return (
    <button className={`gp-grid-card${!item.activo ? ' inactivo' : ''}`} onClick={onClick}>
      <div className="gp-grid-img-wrap">
        {item.imagen ? (
          <img src={item.imagen} alt={item.nombre} loading="lazy" />
        ) : (
          <span className="gp-grid-img-fallback">{item.unidad === 'g' ? ' ' : ' '}</span>
        )}
      </div>
      <span className="gp-grid-name">{item.nombre}</span>
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GestionProductosModal({ onClose, local, localLabel, autoAbrirRegistro = false }) {
  const { colors, isDark, toggle } = useTheme();
  const width = useWindowWidth();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [productos, setProductos] = useState(PRODUCTOS_INICIALES);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState(null);
  const [filtroProveedor, setFiltroProveedor] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false); // 'categoria' | 'proveedor' | false
  const [vista, setVista] = useState('list'); // 'list' | 'grid'

  // Modales
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalActualizar, setModalActualizar] = useState(false);
  const [modalRegistrar, setModalRegistrar] = useState(false);
  const [modalTransferir, setModalTransferir] = useState(false);

  // Producto seleccionado
  const [productoActual, setProductoActual] = useState(null);

  // Formulario editar
  const [editNombre, setEditNombre] = useState('');
  const [editPrecio, setEditPrecio] = useState('');
  const [editMinimo, setEditMinimo] = useState('');
  const [editProveedor, setEditProveedor] = useState('');

  // Formulario actualizar stock
  const [updCodigo, setUpdCodigo] = useState('');
  const [updCantidad, setUpdCantidad] = useState('');
  const [updTipo, setUpdTipo] = useState(TIPOS_MOVIMIENTO[0]);
  const [updLote, setUpdLote] = useState('');
  const [updFechaVenc, setUpdFechaVenc] = useState('');

  // Formulario transferencia
  const [transCantidad, setTransCantidad] = useState('');
  const [transLocal, setTransLocal] = useState('');

  // Formulario registrar
  const [regCodigo, setRegCodigo] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regCategoria, setRegCategoria] = useState(CATEGORIAS[0]);
  const [regProveedor, setRegProveedor] = useState('');
  const [regPrecio, setRegPrecio] = useState('');
  const [regStock, setRegStock] = useState('');
  const [regMinimo, setRegMinimo] = useState('');
  const [regUnidad, setRegUnidad] = useState('uds');
  const [regLote, setRegLote] = useState('');
  const [regFechaVenc, setRegFechaVenc] = useState('');

  // Cerrar con tecla Escape
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Si se solicitó desde afuera, abrir directo el formulario de registrar producto
  useEffect(() => {
    if (autoAbrirRegistro) setModalRegistrar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAbrirRegistro]);

  // ── Filtrado ────────────────────────────────────────────────────────────────
  const proveedores = [...new Set(productos.map((p) => p.proveedor))];

  // Producto encontrado en modal actualizar (para condicionar campos)
  const productoUpdCodigo = productos.find((p) => p.codigo === updCodigo.trim()) || null;
  const updRequiereFechaVenc = productoUpdCodigo ? requiereFechaVenc(productoUpdCodigo.categoria) : true;

  const productosFiltrados = productos.filter((p) => {
    const matchBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.includes(busqueda);
    const matchCategoria = !filtroCategoria || p.categoria === filtroCategoria;
    const matchProveedor = !filtroProveedor || p.proveedor === filtroProveedor;
    return matchBusqueda && matchCategoria && matchProveedor;
  });

  // ── Acciones ────────────────────────────────────────────────────────────────
  function abrirDetalle(producto) {
    setProductoActual(producto);
    setModalDetalle(true);
  }

  function abrirEditar() {
    setEditNombre(productoActual.nombre);
    setEditPrecio(String(productoActual.precio));
    setEditMinimo(String(productoActual.minimo));
    setEditProveedor(productoActual.proveedor);
    setModalEditar(true);
  }

  function guardarEdicion() {
    if (!editNombre.trim()) {
      window.alert('El nombre no puede estar vacío');
      return;
    }
    const actualizado = {
      ...productoActual,
      nombre: editNombre.trim(),
      precio: parseInt(editPrecio) || productoActual.precio,
      minimo: parseInt(editMinimo) || productoActual.minimo,
      proveedor: editProveedor.trim() || productoActual.proveedor,
    };
    setProductos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
    setProductoActual(actualizado);
    setModalEditar(false);
    window.alert('Producto actualizado correctamente');
  }

  // Simula escaneo de pistola (en producción: usar la API real del lector/cámara)
  function simularEscaneo(contexto) {
    if (contexto === 'actualizar') {
      setUpdCodigo('7891234560012');
      window.alert('Escaneado — Código: 7891234560012 — Arroz Premium 1kg');
    } else {
      setRegCodigo('4005808224067');
      window.alert('Escaneado — Código: 4005808224067 detectado');
    }
  }

  function confirmarActualizacion() {
    if (!updCodigo.trim() || !updCantidad.trim()) {
      window.alert('Ingresa código y cantidad');
      return;
    }
    if (!updLote.trim()) {
      window.alert('El número de lote es obligatorio');
      return;
    }
    if (updRequiereFechaVenc && !updFechaVenc.trim()) {
      window.alert('La fecha de vencimiento es obligatoria para esta categoría');
      return;
    }
    const cantidad = parseInt(updCantidad);
    if (isNaN(cantidad) || cantidad <= 0) {
      window.alert('La cantidad debe ser mayor a 0');
      return;
    }
    setProductos((prev) =>
      prev.map((p) =>
        p.codigo === updCodigo.trim() ? { ...p, stock: p.stock + cantidad } : p
      )
    );
    setUpdCodigo('');
    setUpdCantidad('');
    setUpdLote('');
    setUpdFechaVenc('');
    setModalActualizar(false);
    window.alert(`+${cantidad} agregados al stock`);
  }

  function guardarProducto() {
    if (!regCodigo.trim() || !regNombre.trim()) {
      window.alert('Código y nombre son obligatorios');
      return;
    }
    if (!regLote.trim()) {
      window.alert('El número de lote es obligatorio');
      return;
    }
    if (requiereFechaVenc(regCategoria) && !regFechaVenc.trim()) {
      window.alert('La fecha de vencimiento es obligatoria para esta categoría');
      return;
    }
    const existe = productos.find((p) => p.codigo === regCodigo.trim());
    if (existe) {
      window.alert('Ya existe un producto con ese código');
      return;
    }
    const nuevo = {
      id: String(Date.now()),
      nombre: regNombre.trim(),
      codigo: regCodigo.trim(),
      categoria: regCategoria,
      proveedor: regProveedor.trim() || 'Sin proveedor',
      precio: parseInt(regPrecio) || 0,
      stock: parseInt(regStock) || 0,
      minimo: parseInt(regMinimo) || 10,
      unidad: regUnidad,
      activo: true,
      ultima: new Date().toLocaleDateString('es-CL'),
    };
    setProductos((prev) => [nuevo, ...prev]);
    setRegCodigo(''); setRegNombre(''); setRegProveedor('');
    setRegPrecio(''); setRegStock(''); setRegMinimo('');
    setRegLote(''); setRegFechaVenc(''); setRegUnidad('uds');
    setModalRegistrar(false);
    window.alert(`"${nuevo.nombre}" registrado correctamente`);
  }

  function toggleActivo() {
    const actualizado = { ...productoActual, activo: !productoActual.activo };
    setProductos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
    setProductoActual(actualizado);
  }

  function confirmarTransferencia() {
    if (!transCantidad.trim() || !transLocal.trim()) {
      window.alert('Ingresa cantidad y local de destino');
      return;
    }
    const cant = parseInt(transCantidad);
    if (isNaN(cant) || cant <= 0) {
      window.alert('La cantidad debe ser mayor a 0');
      return;
    }
    if (cant > productoActual.stock) {
      window.alert('Stock insuficiente para la transferencia');
      return;
    }
    const actualizado = { ...productoActual, stock: productoActual.stock - cant };
    setProductos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
    setProductoActual(actualizado);
    setTransCantidad(''); setTransLocal('');
    setModalTransferir(false);
    window.alert(`Transferencia realizada — ${cant} ${productoActual.unidad === 'g' ? 'g' : 'uds.'} enviados a "${transLocal}"`);
  }

  // ── Variables CSS de tema ────────────────────────────────────────────────────
  const themeVars = {
    '--gp-bg': colors.bg,
    '--gp-surface': colors.surface,
    '--gp-surface2': colors.surface2,
    '--gp-border': colors.border,
    '--gp-text-primary': colors.textPrimary,
    '--gp-text-secondary': colors.textSecondary,
    '--gp-placeholder': colors.placeholder,
    '--gp-btn-bg': colors.btnBg,
    '--gp-btn-text': colors.btnText,
    '--gp-accent-text': colors.accentText,
  };

  return (
    <div className="gp-overlay" style={themeVars}>

      {/* Header */}
      <div className="gp-topbar">
        <div className="gp-topbar-row">
          <div>
            <p className="gp-topbar-title">Gestión de productos</p>
            <p className="gp-topbar-sub">
              {productosFiltrados.length} productos{localLabel ? ` · ${localLabel}` : ''}
            </p>
          </div>
          <div className="gp-topbar-actions">
            <button className="gp-close-btn" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="gp-search-wrap">
        <div className="gp-search-row">
          <input
            className="gp-search-input"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda.length > 0 && (
            <button className="gp-search-clear-btn" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">✕</button>
          )}
          <button className="gp-search-scan-btn" onClick={() => setBusqueda('7891234560012')} aria-label="Simular escaneo">▦</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="gp-filter-wrap">
        <button
          className={`gp-filter-dropdown${filtroCategoria ? ' active' : ''}`}
          onClick={() => setPickerVisible('categoria')}
        >
          <span className={`gp-filter-dropdown-text${filtroCategoria ? ' active' : ''}`}>
            {filtroCategoria ?? 'Categoría'}
          </span>
          <span className={`gp-filter-dropdown-arrow${filtroCategoria ? ' active' : ''}`}>▾</span>
        </button>

        <button
          className={`gp-filter-dropdown${filtroProveedor ? ' active' : ''}`}
          onClick={() => setPickerVisible('proveedor')}
        >
          <span className={`gp-filter-dropdown-text${filtroProveedor ? ' active' : ''}`}>
            {filtroProveedor ?? 'Proveedor'}
          </span>
          <span className={`gp-filter-dropdown-arrow${filtroProveedor ? ' active' : ''}`}>▾</span>
        </button>

        {(filtroCategoria || filtroProveedor) && (
          <button className="gp-filter-clear" onClick={() => { setFiltroCategoria(null); setFiltroProveedor(null); }} aria-label="Limpiar filtros">
            ✕
          </button>
        )}

        <div className="gp-view-toggle">
          <button
            className={`gp-view-toggle-btn${vista === 'list' ? ' active' : ''}`}
            onClick={() => setVista('list')}
            aria-label="Ver en lista"
            title="Ver en lista"
          >
            ☰
          </button>
          <button
            className={`gp-view-toggle-btn${vista === 'grid' ? ' active' : ''}`}
            onClick={() => setVista('grid')}
            aria-label="Ver en cuadrícula"
            title="Ver en cuadrícula"
          >
            ▦
          </button>
        </div>
      </div>

      {/* Picker de filtros */}
      <FiltroPickerModal
        isDesktop={isDesktop}
        tipo={pickerVisible}
        valorActual={pickerVisible === 'categoria' ? filtroCategoria : filtroProveedor}
        opciones={pickerVisible === 'categoria' ? CATEGORIAS : proveedores}
        onSelect={(opcion) => {
          if (pickerVisible === 'categoria') setFiltroCategoria(opcion);
          else setFiltroProveedor(opcion);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />

      {/* ── Layout desktop: master-detail en fila ────────────────────────────── */}
      {isDesktop ? (
        <div className="gp-master-detail">

          {/* Panel izquierdo: lista */}
          <div className="gp-master-panel">
            {vista === 'grid' ? (
              <div className="gp-grid">
                {productosFiltrados.map((item) => (
                  <TarjetaProductoGrid key={item.id} item={item} onClick={() => abrirDetalle(item)} />
                ))}
              </div>
            ) : (
              <div className="gp-list">
                {productosFiltrados.map((item) => (
                  <TarjetaProducto key={item.id} item={item} onClick={() => abrirDetalle(item)} />
                ))}
              </div>
            )}
            <div className="gp-fab-row">
              <button className="gp-fab gp-fab-update" onClick={() => setModalActualizar(true)}>↑  Actualizar stock</button>
              <button className="gp-fab gp-fab-register" onClick={() => setModalRegistrar(true)}>+  Registrar producto</button>
            </div>
          </div>

          {/* Panel derecho: detalle */}
          <div className="gp-detail-panel">
            {productoActual ? (
              <>
                <div className="gp-sheet-header">
                  <span className="gp-sheet-title">{productoActual.nombre}</span>
                </div>
                <DetalleContenido
                  producto={productoActual}
                  onEditar={abrirEditar}
                  onTransferir={() => setModalTransferir(true)}
                  onToggleActivo={toggleActivo}
                />
              </>
            ) : (
              <div className="gp-detail-empty">
                <div className="gp-detail-empty-text">Selecciona un producto para ver su detalle</div>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ── Layout móvil: lista + FABs ──────────────────────────────────────── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {vista === 'grid' ? (
            <div className="gp-grid">
              {productosFiltrados.map((item) => (
                <TarjetaProductoGrid key={item.id} item={item} onClick={() => abrirDetalle(item)} />
              ))}
            </div>
          ) : (
            <div className="gp-list">
              {productosFiltrados.map((item) => (
                <TarjetaProducto key={item.id} item={item} onClick={() => abrirDetalle(item)} />
              ))}
            </div>
          )}
          <div className="gp-fab-row">
            <button className="gp-fab gp-fab-update" onClick={() => setModalActualizar(true)}>↑  Actualizar stock</button>
            <button className="gp-fab gp-fab-register" onClick={() => setModalRegistrar(true)}>+  Registrar producto</button>
          </div>
        </div>
      )}

      {/* ── Modal: Detalle (solo móvil) ───────────────────────────────────────── */}
      <DetalleModal
        isDesktop={isDesktop}
        visible={modalDetalle}
        producto={productoActual}
        onClose={() => setModalDetalle(false)}
        onEditar={abrirEditar}
        onTransferir={() => setModalTransferir(true)}
        onToggleActivo={toggleActivo}
      />

      {/* ── Modal: Editar ──────────────────────────────────────────────────── */}
      <EditarModal
        isDesktop={isDesktop}
        visible={modalEditar}
        onClose={() => setModalEditar(false)}
        onGuardar={guardarEdicion}
        nombre={editNombre} setNombre={setEditNombre}
        precio={editPrecio} setPrecio={setEditPrecio}
        minimo={editMinimo} setMinimo={setEditMinimo}
        proveedor={editProveedor} setProveedor={setEditProveedor}
        unidad={productoActual?.unidad}
      />

      {/* ── Modal: Actualizar stock ────────────────────────────────────────── */}
      <ActualizarStockModal
        isDesktop={isDesktop}
        visible={modalActualizar}
        onClose={() => setModalActualizar(false)}
        onConfirmar={confirmarActualizacion}
        onEscanear={() => simularEscaneo('actualizar')}
        codigo={updCodigo} setCodigo={setUpdCodigo}
        cantidad={updCantidad} setCantidad={setUpdCantidad}
        lote={updLote} setLote={setUpdLote}
        fechaVenc={updFechaVenc} setFechaVenc={setUpdFechaVenc}
        tipo={updTipo} setTipo={setUpdTipo}
        tiposMovimiento={TIPOS_MOVIMIENTO}
        productoEncontrado={productoUpdCodigo}
        requiereFechaVenc={updRequiereFechaVenc}
      />

      {/* ── Modal: Registrar producto ──────────────────────────────────────── */}
      <RegistrarModal
        isDesktop={isDesktop}
        visible={modalRegistrar}
        onClose={() => setModalRegistrar(false)}
        onGuardar={guardarProducto}
        onEscanear={() => simularEscaneo('registrar')}
        codigo={regCodigo} setCodigo={setRegCodigo}
        nombre={regNombre} setNombre={setRegNombre}
        categoria={regCategoria} setCategoria={setRegCategoria}
        categorias={CATEGORIAS}
        proveedor={regProveedor} setProveedor={setRegProveedor}
        unidad={regUnidad} setUnidad={setRegUnidad}
        lote={regLote} setLote={setRegLote}
        fechaVenc={regFechaVenc} setFechaVenc={setRegFechaVenc}
        precio={regPrecio} setPrecio={setRegPrecio}
        stock={regStock} setStock={setRegStock}
        minimo={regMinimo} setMinimo={setRegMinimo}
        requiereFechaVenc={requiereFechaVenc(regCategoria)}
      />

      {/* ── Modal: Transferir a otro local ──────────────────────────────────── */}
      <TransferirModal
        isDesktop={isDesktop}
        visible={modalTransferir}
        onClose={() => setModalTransferir(false)}
        onConfirmar={confirmarTransferencia}
        producto={productoActual}
        cantidad={transCantidad} setCantidad={setTransCantidad}
        local={transLocal} setLocal={setTransLocal}
      />

    </div>
  );
}