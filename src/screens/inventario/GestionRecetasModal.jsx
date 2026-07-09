import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { RECETAS_INICIALES, CATEGORIAS_RECETAS } from './gestionRecetasData';
import { FormReceta, DetalleContenido, DetalleModal } from './GestionRecetasForms';
import '../../css/GestionRecetas.css';

const DESKTOP_BREAKPOINT = 768;

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

// ─── Tarjeta de receta (vista lista) ──────────────────────────────────────────

function TarjetaReceta({ item, isSelected, onClick }) {
  return (
    <button className={`rec-card${isSelected ? ' selected' : ''}`} onClick={onClick}>
      <div className="rec-card-icon">
        {item.imagen ? <img src={item.imagen} alt={item.nombre} loading="lazy" /> : '🍽️'}
      </div>
      <div className="rec-card-info">
        <div className="rec-card-nombre">{item.nombre}</div>
        <div className="rec-categoria-badge">{item.categoria}</div>
        <div className="rec-card-sub">{item.ingredientes.length} ingredientes</div>
        <div className={`rec-badge ${item.activa ? 'rec-badge-ok' : 'rec-badge-out'}`}>
          {item.activa ? 'Activa' : 'Desactivada'}
        </div>
      </div>
      <div className="rec-card-right">
        <div className="rec-precio-num">${item.precio.toLocaleString('es-CL')}</div>
        <div className="rec-precio-lbl">CLP</div>
      </div>
    </button>
  );
}

// ─── Tarjeta de receta (vista cuadrícula) ─────────────────────────────────────

function TarjetaRecetaGrid({ item, onClick }) {
  return (
    <button className={`rec-grid-card${!item.activa ? ' inactiva' : ''}`} onClick={onClick}>
      <div className="rec-grid-img-wrap">
        {item.imagen ? (
          <img src={item.imagen} alt={item.nombre} loading="lazy" />
        ) : (
          <span className="rec-grid-img-fallback">🍽️</span>
        )}
      </div>
      <span className="rec-grid-name">{item.nombre}</span>
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GestionRecetasModal({ onClose, local, localLabel }) {
  const { colors, isDark, toggle } = useTheme();
  const width = useWindowWidth();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [recetas, setRecetas] = useState(RECETAS_INICIALES);
  const [recetaActual, setRecetaActual] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [vista, setVista] = useState('list'); // 'list' | 'grid'

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [ingredientes, setIngredientes] = useState([]);
  const [categoria, setCategoria] = useState('');

  // Cerrar con tecla Escape
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // ── Helpers ────────────────────────────

  function resetForm() {
    setNombre('');
    setCategoria('');
    setPrecio('');
    setIngredientes([]);
  }

  function abrirDetalle(r) {
    setRecetaActual(r);
    if (!isDesktop) setModalDetalle(true);
  }

  function abrirCrear() {
    resetForm();
    setModalCrear(true);
  }

  function abrirEditar() {
    setNombre(recetaActual.nombre);
    setCategoria(recetaActual.categoria);
    setPrecio(String(recetaActual.precio));
    setIngredientes(recetaActual.ingredientes.map((i) => ({ ...i })));
    setModalEditar(true);
  }

  // ── Validación de ingredientes ──────────

  function ingredientesValidos() {
    return ingredientes.every((ing) => ing.nombre && String(ing.cantidad).trim() !== '' && Number(ing.cantidad) > 0);
  }

  // ── CRUD ─────────────────────────────

  function crearReceta() {
    if (!nombre.trim()) {
      window.alert('El nombre no puede estar vacío');
      return;
    }
    if (!ingredientesValidos()) {
      window.alert('Completa el nombre y la cantidad de todos los ingredientes');
      return;
    }
    const nueva = {
      id: Date.now().toString(),
      nombre: nombre.trim(),
      categoria,
      precio: parseInt(precio) || 0,
      ingredientes: ingredientes.map((i) => ({ ...i, cantidad: Number(i.cantidad) })),
      activa: true,
    };
    setRecetas((prev) => [nueva, ...prev]);
    resetForm();
    setModalCrear(false);
    window.alert(`"${nueva.nombre}" creada correctamente`);
  }

  function guardarEdicion() {
    if (!nombre.trim()) {
      window.alert('El nombre no puede estar vacío');
      return;
    }
    if (!ingredientesValidos()) {
      window.alert('Completa el nombre y la cantidad de todos los ingredientes');
      return;
    }
    const actualizada = {
      ...recetaActual,
      nombre: nombre.trim(),
      categoria,
      precio: parseInt(precio) || recetaActual.precio,
      ingredientes: ingredientes.map((i) => ({ ...i, cantidad: Number(i.cantidad) })),
    };
    setRecetas((prev) => prev.map((r) => (r.id === actualizada.id ? actualizada : r)));
    setRecetaActual(actualizada);
    setModalEditar(false);
    window.alert('Receta actualizada correctamente');
  }

  function toggleActiva(id) {
    setRecetas((prev) => prev.map((r) => (r.id === id ? { ...r, activa: !r.activa } : r)));
    setRecetaActual((prev) => (prev?.id === id ? { ...prev, activa: !prev.activa } : prev));
  }

  // ── Filtrado ─────────────────────────

  const recetasFiltradas = recetas.filter((r) => {
    const coincideBusqueda = r.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaFiltro === null || r.categoria === categoriaFiltro;
    return coincideBusqueda && coincideCategoria;
  });

  const categoriasConRecetas = CATEGORIAS_RECETAS.filter((c) =>
    recetas.some((r) => r.categoria === c.nombre)
  );

  // ── Variables CSS de tema ────────────────────────────────────────────────────
  const themeVars = {
    '--rec-bg': colors.bg,
    '--rec-surface': colors.surface,
    '--rec-surface2': colors.surface2,
    '--rec-border': colors.border,
    '--rec-text-primary': colors.textPrimary,
    '--rec-text-secondary': colors.textSecondary,
    '--rec-placeholder': colors.placeholder,
    '--rec-btn-bg': colors.btnBg,
    '--rec-btn-text': colors.btnText,
  };

  return (
    <div className="rec-overlay" style={themeVars}>

      {/* Header */}
      <div className="rec-topbar">
        <div className="rec-topbar-row">
          <div>
            <p className="rec-topbar-title">Gestión de recetas</p>
            <p className="rec-topbar-sub">
              {recetasFiltradas.length} recetas{localLabel ? ` · ${localLabel}` : ''}
            </p>
          </div>
          <div className="rec-topbar-actions">
            <button className="rec-close-btn" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="rec-search-wrap">
        <div className="rec-search-row">
          <input
            className="rec-search-input"
            placeholder="Buscar receta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda.length > 0 && (
            <button className="rec-search-clear-btn" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">✕</button>
          )}
        </div>
      </div>

      {/* Filtros de categoría + toggle de vista */}
      <div className="rec-categorias-wrap">
        <div className="rec-categorias-row">
          <button
            className={`rec-cat-chip${categoriaFiltro === null ? ' active' : ''}`}
            onClick={() => setCategoriaFiltro(null)}
          >
            Todas
          </button>
          {categoriasConRecetas.map((cat) => (
            <button
              key={cat.nombre}
              className={`rec-cat-chip${categoriaFiltro === cat.nombre ? ' active' : ''}`}
              onClick={() => setCategoriaFiltro((prev) => (prev === cat.nombre ? null : cat.nombre))}
            >
              {cat.nombre}
            </button>
          ))}

          <div className="rec-view-toggle">
            <button
              className={`rec-view-toggle-btn${vista === 'list' ? ' active' : ''}`}
              onClick={() => setVista('list')}
              aria-label="Ver en lista"
              title="Ver en lista"
            >
              ☰
            </button>
            <button
              className={`rec-view-toggle-btn${vista === 'grid' ? ' active' : ''}`}
              onClick={() => setVista('grid')}
              aria-label="Ver en cuadrícula"
              title="Ver en cuadrícula"
            >
              ▦
            </button>
          </div>
        </div>
      </div>

      {/* Layout desktop / móvil */}
      {isDesktop ? (
        <div className="rec-master-detail">
          <div className="rec-master-panel">
            {vista === 'grid' ? (
              <div className="rec-grid">
                {recetasFiltradas.map((item) => (
                  <TarjetaRecetaGrid key={item.id} item={item} onClick={() => abrirDetalle(item)} />
                ))}
              </div>
            ) : (
              <div className="rec-list">
                {recetasFiltradas.map((item) => (
                  <TarjetaReceta
                    key={item.id}
                    item={item}
                    isSelected={recetaActual?.id === item.id}
                    onClick={() => abrirDetalle(item)}
                  />
                ))}
              </div>
            )}
            <div className="rec-fab-row">
              <button className="rec-fab" onClick={abrirCrear}>+ Nueva receta</button>
            </div>
          </div>

          <div className="rec-detail-panel">
            {recetaActual ? (
              <>
                <div className="rec-sheet-header">
                  <span className="rec-sheet-title">{recetaActual.nombre}</span>
                </div>
                <DetalleContenido
                  receta={recetaActual}
                  onEditar={abrirEditar}
                  onToggleActiva={() => toggleActiva(recetaActual.id)}
                />
              </>
            ) : (
              <div className="rec-detail-empty">
                <div className="rec-detail-empty-text">Selecciona una receta para ver su detalle</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {vista === 'grid' ? (
            <div className="rec-grid">
              {recetasFiltradas.map((item) => (
                <TarjetaRecetaGrid key={item.id} item={item} onClick={() => abrirDetalle(item)} />
              ))}
            </div>
          ) : (
            <div className="rec-list">
              {recetasFiltradas.map((item) => (
                <TarjetaReceta key={item.id} item={item} isSelected={false} onClick={() => abrirDetalle(item)} />
              ))}
            </div>
          )}
          <div className="rec-fab-row">
            <button className="rec-fab" onClick={abrirCrear}>+ Nueva receta</button>
          </div>
        </div>
      )}

      {/* Modal detalle (solo móvil) */}
      <DetalleModal
        isDesktop={isDesktop}
        visible={modalDetalle}
        receta={recetaActual}
        onClose={() => setModalDetalle(false)}
        onEditar={abrirEditar}
        onToggleActiva={() => toggleActiva(recetaActual?.id)}
      />

      {/* Modal crear */}
      <FormReceta
        visible={modalCrear}
        titulo="Nueva receta"
        isDesktop={isDesktop}
        nombre={nombre} setNombre={setNombre}
        categoria={categoria} setCategoria={setCategoria}
        precio={precio} setPrecio={setPrecio}
        ingredientes={ingredientes} setIngredientes={setIngredientes}
        onGuardar={crearReceta}
        onCerrar={() => setModalCrear(false)}
      />

      {/* Modal editar */}
      <FormReceta
        visible={modalEditar}
        titulo="Editar receta"
        isDesktop={isDesktop}
        nombre={nombre} setNombre={setNombre}
        categoria={categoria} setCategoria={setCategoria}
        precio={precio} setPrecio={setPrecio}
        ingredientes={ingredientes} setIngredientes={setIngredientes}
        onGuardar={guardarEdicion}
        onCerrar={() => setModalEditar(false)}
      />

    </div>
  );
}