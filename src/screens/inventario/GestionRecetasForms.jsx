import { useState } from 'react';
import {
  INGREDIENTES_DB, CATEGORIAS_RECETAS, UNIDADES_POR_TIPO, UNIDAD_DEFAULT_POR_TIPO,
  getIngredienteMeta, formatCantidadIngrediente, calcularUnidadesAprox,
} from './gestionRecetasData';

// ─── Campo de formulario reutilizable ────────────────────────────────────────

export function FormField({ label, value, onChangeText, placeholder, type = 'text', min }) {
  return (
    <div className="rec-form-group">
      <label className="rec-form-label">{label}</label>
      <input
        className="rec-form-input"
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        autoCapitalize="none"
      />
    </div>
  );
}

// ─── Envoltorio genérico de modal (overlay + sheet, responsive) ─────────────

function ModalShell({ isDesktop, onClose, title, children, showHandle = true }) {
  return (
    <div className={`rec-modal-overlay${isDesktop ? ' desktop' : ''}`} onClick={onClose}>
      <div className={`rec-bottom-sheet${isDesktop ? ' desktop' : ''}`} onClick={(e) => e.stopPropagation()}>
        {!isDesktop && showHandle && <div className="rec-sheet-handle" />}
        <div className="rec-sheet-header">
          <span className="rec-sheet-title">{title}</span>
          <button className="rec-sheet-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="rec-sheet-body">{children}</div>
      </div>
    </div>
  );
}

// ─── Dropdown genérico (reemplaza al Modal+Pressable de RN) ─────────────────

export function DropdownPicker({ label, valor, opciones, onSeleccionar, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="rec-form-group" style={{ marginBottom: 6 }}>
      {label ? <span className="rec-form-label">{label}</span> : null}
      <button type="button" className="rec-dropdown-btn" onClick={() => setVisible(true)}>
        <span className={valor ? 'rec-dropdown-text' : 'rec-dropdown-placeholder'}>
          {valor || placeholder}
        </span>
        <span className="rec-dropdown-arrow">▾</span>
      </button>

      {visible && (
        <div className="rec-picker-overlay" onClick={() => setVisible(false)}>
          <div className="rec-picker-box" onClick={(e) => e.stopPropagation()}>
            <div className="rec-picker-header">
              <span className="rec-picker-title">{label || placeholder}</span>
              <button className="rec-sheet-close" onClick={() => setVisible(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="rec-picker-list">
              {opciones.map((op) => (
                <button
                  key={op}
                  className={`rec-picker-option${valor === op ? ' active' : ''}`}
                  onClick={() => { onSeleccionar(op); setVisible(false); }}
                >
                  <span className={`rec-picker-option-text${valor === op ? ' active' : ''}`}>{op}</span>
                  {valor === op && <span className="rec-picker-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fila de ingrediente: nombre + cantidad libre + unidad ──────────────────

export function IngredienteRow({ ing, index, onActualizar, onEliminar }) {
  const meta = getIngredienteMeta(ing.nombre);
  const tipo = ing.nombre ? meta.tipo : null;
  const unidadesDisponibles = tipo ? UNIDADES_POR_TIPO[tipo] : [];

  function handleSeleccionarNombre(val) {
    const nuevaMeta = getIngredienteMeta(val);
    onActualizar(index, 'nombre', val);
    onActualizar(index, 'cantidad', '');
    onActualizar(index, 'unidad', UNIDAD_DEFAULT_POR_TIPO[nuevaMeta.tipo]);
  }

  const labelCantidad = tipo === 'unidad'
    ? `Cantidad (${ing.cantidad === 1 ? (meta.labelSingular || 'unidad') : (meta.labelPlural || 'unidades')})`
    : 'Cantidad';

  return (
    <div className="rec-ing-card">
      <DropdownPicker
        label="Ingrediente"
        valor={ing.nombre}
        opciones={INGREDIENTES_DB.map((i) => i.nombre)}
        onSeleccionar={handleSeleccionarNombre}
        placeholder="Seleccionar ingrediente..."
      />

      {ing.nombre !== '' && (
        <div className="rec-cantidad-row">
          <div className="rec-form-group" style={{ flex: 1 }}>
            <span className="rec-form-label">{labelCantidad}</span>
            <input
              className="rec-form-input"
              type="number"
              min="0"
              step={tipo === 'unidad' ? 1 : 'any'}
              placeholder={tipo === 'unidad' ? 'Ej: 2' : 'Ej: 250'}
              value={ing.cantidad}
              onChange={(e) => onActualizar(index, 'cantidad', e.target.value)}
            />
          </div>

          {tipo !== 'unidad' && (
            <div className="rec-form-group">
              <span className="rec-form-label">Unidad</span>
              <div className="rec-unidad-toggle">
                {unidadesDisponibles.map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={`rec-unidad-btn${ing.unidad === u ? ' active' : ''}`}
                    onClick={() => onActualizar(index, 'unidad', u)}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button className="rec-ing-eliminar" onClick={() => onEliminar(index)}>Eliminar ingrediente</button>
    </div>
  );
}

// ─── Formulario crear/editar receta ──────────────────────────────────────────

export function FormReceta({
  visible, titulo, isDesktop,
  nombre, setNombre, categoria, setCategoria, precio, setPrecio,
  ingredientes, setIngredientes, onGuardar, onCerrar,
}) {
  if (!visible) return null;

  function agregarIngrediente() {
    setIngredientes((prev) => [...prev, { nombre: '', cantidad: '', unidad: '' }]);
  }

  function actualizarIngrediente(i, campo, valor) {
    setIngredientes((prev) => prev.map((ing, idx) => (idx === i ? { ...ing, [campo]: valor } : ing)));
  }

  function eliminarIngrediente(i) {
    setIngredientes((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <ModalShell isDesktop={isDesktop} onClose={onCerrar} title={titulo}>
      <div className="rec-form-wrap">
        <div className="rec-form-group">
          <span className="rec-form-label">Nombre de la receta *</span>
          <input
            className="rec-form-input"
            placeholder="Ej: Papas fritas"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="rec-form-group">
          <span className="rec-form-label">Categoria</span>
          <DropdownPicker
            valor={categoria}
            opciones={CATEGORIAS_RECETAS.map((c) => c.nombre)}
            onSeleccionar={setCategoria}
            placeholder="Seleccionar categoria..."
          />
        </div>

        <div className="rec-form-group">
          <span className="rec-form-label">Precio de venta ($)</span>
          <input
            className="rec-form-input"
            type="number"
            placeholder="Ej: 2500"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </div>

        <div className="rec-form-group">
          <span className="rec-form-label">Ingredientes</span>
          {ingredientes.map((ing, i) => (
            <IngredienteRow
              key={i}
              ing={ing}
              index={i}
              onActualizar={actualizarIngrediente}
              onEliminar={eliminarIngrediente}
            />
          ))}
          <button className="rec-add-ing-btn" onClick={agregarIngrediente}>+ Agregar ingrediente</button>
        </div>

        <button className="rec-btn-primary" onClick={onGuardar}>Guardar receta</button>
        <div style={{ height: 20 }} />
      </div>
    </ModalShell>
  );
}

// ─── Contenido de detalle (compartido entre panel desktop y modal móvil) ────

export function DetalleContenido({ receta, onEditar, onToggleActiva }) {
  if (!receta) return null;

  const stats = [
    { label: 'Precio de venta', value: '$' + receta.precio.toLocaleString('es-CL'), sub: 'CLP' },
    { label: 'Ingredientes', value: String(receta.ingredientes.length), sub: 'items' },
    { label: 'Estado', value: receta.activa ? 'Activa' : 'Desactivada' },
  ];

  return (
    <>
      <div className="rec-stats-grid">
        {stats.map((item, i) => (
          <div key={i} className="rec-stat-card">
            <div className="rec-stat-label">{item.label}</div>
            <div className="rec-stat-value">{item.value}</div>
            {item.sub && <div className="rec-stat-sub">{item.sub}</div>}
          </div>
        ))}
      </div>

      <div className="rec-info-block">
        <div className="rec-block-title">Ingredientes</div>
        {receta.ingredientes.length === 0 ? (
          <div className="rec-info-row"><span className="rec-info-key">Sin ingredientes registrados</span></div>
        ) : (
          receta.ingredientes.map((ing, idx) => {
            const aprox = calcularUnidadesAprox(ing);
            return (
              <div key={idx} className="rec-info-row">
                <span className="rec-info-key">{ing.nombre}</span>
                <span className="rec-info-val">
                  {formatCantidadIngrediente(ing)}{aprox ? ` (${aprox})` : ''}
                </span>
              </div>
            );
          })
        )}
      </div>

      <button className="rec-edit-btn" onClick={onEditar}>Editar receta</button>

      <button
        className="rec-edit-btn"
        style={{ marginTop: 8, borderColor: receta.activa ? '#F5C6C6' : '#B5D4F4', color: receta.activa ? '#791F1F' : '#0C447C' }}
        onClick={onToggleActiva}
      >
        {receta.activa ? 'Desactivar receta' : 'Activar receta'}
      </button>

      <div style={{ height: 20 }} />
    </>
  );
}

// ─── Modal: Detalle (solo se usa en layout móvil) ───────────────────────────

export function DetalleModal({ isDesktop, visible, receta, onClose, onEditar, onToggleActiva }) {
  if (isDesktop || !visible) return null;
  return (
    <ModalShell isDesktop={false} onClose={onClose} title={receta?.nombre || ''}>
      <DetalleContenido receta={receta} onEditar={onEditar} onToggleActiva={onToggleActiva} />
    </ModalShell>
  );
}
