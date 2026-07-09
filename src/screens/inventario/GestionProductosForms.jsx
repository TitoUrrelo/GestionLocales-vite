import { formatStock, formatPrecio, formatQtyHistorial, HISTORIALES } from './gestionProductosData';

// ─── Campo de formulario reutilizable ────────────────────────────────────────

export function FormField({ label, value, onChangeText, placeholder, type = 'text' }) {
  return (
    <div className="gp-form-group">
      <label className="gp-form-label">{label}</label>
      <input
        className="gp-form-input"
        type={type}
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
    <div
      className={`gp-modal-overlay${isDesktop ? ' desktop' : ''}`}
      onClick={onClose}
    >
      <div
        className={`gp-bottom-sheet${isDesktop ? ' desktop' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {!isDesktop && showHandle && <div className="gp-sheet-handle" />}
        <div className="gp-sheet-header">
          <span className="gp-sheet-title">{title}</span>
          <button className="gp-sheet-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="gp-sheet-body">{children}</div>
      </div>
    </div>
  );
}

// ─── Picker de filtros (categoría / proveedor) ───────────────────────────────

export function FiltroPickerModal({
  isDesktop, tipo, valorActual, opciones, onSelect, onClose,
}) {
  if (!tipo) return null;
  const titulo = tipo === 'categoria' ? 'Filtrar por categoría' : 'Filtrar por proveedor';
  return (
    <ModalShell isDesktop={isDesktop} onClose={onClose} title={titulo}>
      <button className={`gp-picker-option${!valorActual ? ' active' : ''}`} onClick={() => onSelect(null)}>
        <span className="gp-picker-option-text">Todos</span>
        {!valorActual && <span className="gp-picker-check">✓</span>}
      </button>
      {opciones.map((opcion) => {
        const activo = valorActual === opcion;
        return (
          <button
            key={opcion}
            className={`gp-picker-option${activo ? ' active' : ''}`}
            onClick={() => onSelect(opcion)}
          >
            <span className={`gp-picker-option-text${activo ? ' active' : ''}`}>{opcion}</span>
            {activo && <span className="gp-picker-check">✓</span>}
          </button>
        );
      })}
      <div style={{ height: 20 }} />
    </ModalShell>
  );
}

// ─── Contenido de detalle (compartido entre panel desktop y modal móvil) ────

export function DetalleContenido({ producto, onEditar, onTransferir, onToggleActivo }) {
  if (!producto) return null;
  const stockLabel = formatStock(producto.stock, producto.unidad || 'uds');
  const minimoLabel = formatStock(producto.minimo, producto.unidad || 'uds');

  const stats = [
    { label: 'Stock actual', value: stockLabel, sub: producto.unidad === 'g' ? 'peso' : 'unidades' },
    { label: producto.unidad === 'g' ? 'Precio por kg' : 'Precio unitario', value: formatPrecio(producto.precio, producto.unidad || 'uds'), sub: 'CLP' },
    { label: 'Categoría', value: producto.categoria },
    { label: 'Proveedor', value: producto.proveedor },
  ];

  const datos = [
    { k: 'Código', v: producto.codigo },
    { k: 'Stock mínimo', v: minimoLabel },
    { k: 'Tipo de stock', v: producto.unidad === 'g' ? 'Por peso (gramos/kg)' : 'Por unidad' },
    { k: 'Última actualización', v: producto.ultima },
  ];

  return (
    <>
      {/* Stats */}
      <div className="gp-stats-grid">
        {stats.map((item, i) => (
          <div key={i} className="gp-stat-card">
            <div className="gp-stat-label">{item.label}</div>
            <div className="gp-stat-value">{item.value}</div>
            {item.sub && <div className="gp-stat-sub">{item.sub}</div>}
          </div>
        ))}
      </div>

      {/* Datos adicionales */}
      <div className="gp-info-block">
        <div className="gp-block-title">Datos adicionales</div>
        {datos.map((row, i) => (
          <div key={i} className="gp-info-row">
            <span className="gp-info-key">{row.k}</span>
            <span className="gp-info-val">{row.v}</span>
          </div>
        ))}
      </div>

      {/* Switch estado activo */}
      <div className="gp-info-block">
        <div className="gp-info-row">
          <div style={{ flex: 1 }}>
            <div className="gp-info-key">Estado del producto</div>
            <div className="gp-stat-sub" style={{ marginTop: 2 }}>
              {producto.activo ? 'Visible y disponible para venta' : 'Oculto / fuera de operación'}
            </div>
          </div>
          <button
            className={`gp-switch-track ${producto.activo ? 'gp-switch-on' : 'gp-switch-off'}`}
            onClick={onToggleActivo}
            aria-label="Alternar estado activo"
          >
            <span className="gp-switch-thumb" />
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="gp-info-block">
        <div className="gp-block-title">Historial de movimientos</div>
        {(HISTORIALES[producto.id] || []).map((h, i) => (
          <div key={i} className="gp-hist-row">
            <span className={`gp-hist-dot ${h.pos ? 'gp-hist-dot-in' : 'gp-hist-dot-adj'}`} />
            <div className="gp-hist-info">
              <div className="gp-hist-tipo">{h.tipo}</div>
              <div className="gp-hist-fecha">{h.fecha}</div>
            </div>
            <span className={h.pos ? 'gp-hist-pos' : 'gp-hist-neg'}>
              {formatQtyHistorial(h.qty, producto.unidad || 'uds')}
            </span>
          </div>
        ))}
      </div>

      {/* Botones de acción */}
      <button className="gp-edit-btn" onClick={onEditar}>✎  Editar datos del producto</button>
      <button className="gp-edit-btn gp-edit-btn-transfer" onClick={onTransferir}>⇄  Transferir a otro local</button>

      <div style={{ height: 20 }} />
    </>
  );
}

// ─── Modal: Detalle (solo se usa en layout móvil, en desktop va en el panel) ─

export function DetalleModal({ isDesktop, visible, producto, onClose, onEditar, onTransferir, onToggleActivo }) {
  if (isDesktop || !visible) return null;
  return (
    <ModalShell isDesktop={false} onClose={onClose} title={producto?.nombre || ''}>
      <DetalleContenido
        producto={producto}
        onEditar={onEditar}
        onTransferir={onTransferir}
        onToggleActivo={onToggleActivo}
      />
    </ModalShell>
  );
}

// ─── Modal: Editar producto ──────────────────────────────────────────────────

export function EditarModal({
  isDesktop, visible, onClose, onGuardar,
  nombre, setNombre, precio, setPrecio, minimo, setMinimo, proveedor, setProveedor,
  unidad,
}) {
  if (!visible) return null;
  return (
    <ModalShell isDesktop={isDesktop} onClose={onClose} title="Editar producto">
      <div className="gp-form-wrap">
        <FormField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Nombre del producto" />
        <FormField
          label={unidad === 'g' ? 'Precio por kg ($)' : 'Precio unitario ($)'}
          value={precio}
          onChangeText={setPrecio}
          placeholder="Ej: 1290"
          type="number"
        />
        <FormField label="Stock mínimo" value={minimo} onChangeText={setMinimo} placeholder="Ej: 20" type="number" />
        <FormField label="Proveedor" value={proveedor} onChangeText={setProveedor} placeholder="Nombre del proveedor" />
        <button className="gp-btn-primary" onClick={onGuardar}>Guardar cambios</button>
        <div style={{ height: 20 }} />
      </div>
    </ModalShell>
  );
}

// ─── Modal: Actualizar stock ──────────────────────────────────────────────────

export function ActualizarStockModal({
  isDesktop, visible, onClose, onConfirmar, onEscanear,
  codigo, setCodigo, cantidad, setCantidad, lote, setLote, fechaVenc, setFechaVenc,
  tipo, setTipo, tiposMovimiento, productoEncontrado, requiereFechaVenc,
}) {
  if (!visible) return null;
  return (
    <ModalShell isDesktop={isDesktop} onClose={onClose} title="Actualizar stock">
      <div className="gp-form-wrap">
        <button className="gp-scan-box" onClick={onEscanear}>
          <span className="gp-scan-icon">▦</span>
          <span className="gp-scan-title">Escanear código de barras</span>
          <span className="gp-scan-sub">Usa la pistola o haz clic para simular</span>
        </button>

        <div className="gp-or-divider">— o ingresa manualmente —</div>

        <FormField label="Código de barras" value={codigo} onChangeText={setCodigo} placeholder="Ej: 7891234560012" type="text" />

        {productoEncontrado && (
          <div className="gp-found-box">
            <div className="gp-found-title">PRODUCTO ENCONTRADO</div>
            <div className="gp-found-name">{productoEncontrado.nombre}</div>
            <div className="gp-found-sub">
              {productoEncontrado.categoria} · Stock: {formatStock(productoEncontrado.stock, productoEncontrado.unidad || 'uds')}
            </div>
          </div>
        )}

        <FormField
          label={productoEncontrado?.unidad === 'g' ? 'Cantidad a ingresar (gramos)' : 'Cantidad a ingresar (unidades)'}
          value={cantidad}
          onChangeText={setCantidad}
          placeholder={productoEncontrado?.unidad === 'g' ? 'Ej: 5000' : 'Ej: 50'}
          type="number"
        />
        <FormField label="Número de lote *" value={lote} onChangeText={setLote} placeholder="Ej: LOTE-001" />
        {requiereFechaVenc && (
          <FormField label="Fecha de vencimiento *" value={fechaVenc} onChangeText={setFechaVenc} placeholder="DD/MM/AAAA" />
        )}

        <div className="gp-form-group">
          <span className="gp-form-label">TIPO DE MOVIMIENTO</span>
          <div className="gp-select-wrap">
            {tiposMovimiento.map((t) => (
              <button
                key={t}
                className={`gp-select-option${tipo === t ? ' active' : ''}`}
                onClick={() => setTipo(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button className="gp-btn-primary" onClick={onConfirmar}>Confirmar actualización</button>
        <div style={{ height: 20 }} />
      </div>
    </ModalShell>
  );
}

// ─── Modal: Registrar producto ────────────────────────────────────────────────

export function RegistrarModal({
  isDesktop, visible, onClose, onGuardar, onEscanear,
  codigo, setCodigo, nombre, setNombre, categoria, setCategoria, categorias,
  proveedor, setProveedor, unidad, setUnidad, lote, setLote, fechaVenc, setFechaVenc,
  precio, setPrecio, stock, setStock, minimo, setMinimo, requiereFechaVenc,
}) {
  if (!visible) return null;
  return (
    <ModalShell isDesktop={isDesktop} onClose={onClose} title="Registrar producto">
      <div className="gp-form-wrap">
        <button className="gp-scan-box" onClick={onEscanear}>
          <span className="gp-scan-icon">▦</span>
          <span className="gp-scan-title">Escanear código de barras</span>
          <span className="gp-scan-sub">Usa la pistola o haz clic para simular</span>
        </button>

        <div className="gp-or-divider">— o ingresa manualmente —</div>

        <FormField label="Código de barras *" value={codigo} onChangeText={setCodigo} placeholder="Ej: 4005808224067" />
        <FormField label="Nombre del producto *" value={nombre} onChangeText={setNombre} placeholder="Ej: Aceite oliva 500ml" />

        <div className="gp-form-group">
          <span className="gp-form-label">CATEGORÍA</span>
          <div className="gp-select-wrap">
            {categorias.map((cat) => (
              <button
                key={cat}
                className={`gp-select-option${categoria === cat ? ' active' : ''}`}
                onClick={() => setCategoria(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <FormField label="Proveedor" value={proveedor} onChangeText={setProveedor} placeholder="Ej: Distribuidora Norte" />

        <div className="gp-form-group">
          <span className="gp-form-label">TIPO DE STOCK</span>
          <div className="gp-select-wrap">
            {[{ label: 'Por unidades', val: 'uds' }, { label: 'Por peso (gramos)', val: 'g' }].map((op) => (
              <button
                key={op.val}
                className={`gp-select-option${unidad === op.val ? ' active' : ''}`}
                onClick={() => setUnidad(op.val)}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        <FormField label="Número de lote *" value={lote} onChangeText={setLote} placeholder="Ej: LOTE-001" />
        {requiereFechaVenc && (
          <FormField label="Fecha de vencimiento *" value={fechaVenc} onChangeText={setFechaVenc} placeholder="DD/MM/AAAA" />
        )}
        <FormField
          label={unidad === 'g' ? 'Precio por kg ($)' : 'Precio unitario ($)'}
          value={precio}
          onChangeText={setPrecio}
          placeholder="Ej: 1290"
          type="number"
        />
        <FormField
          label={unidad === 'g' ? 'Stock inicial (gramos)' : 'Stock inicial (unidades)'}
          value={stock}
          onChangeText={setStock}
          placeholder={unidad === 'g' ? 'Ej: 5000' : 'Ej: 100'}
          type="number"
        />
        <FormField
          label={unidad === 'g' ? 'Stock mínimo (gramos)' : 'Stock mínimo (unidades)'}
          value={minimo}
          onChangeText={setMinimo}
          placeholder={unidad === 'g' ? 'Ej: 1000' : 'Ej: 20'}
          type="number"
        />

        <button className="gp-btn-primary" onClick={onGuardar}>Guardar producto</button>
        <div style={{ height: 20 }} />
      </div>
    </ModalShell>
  );
}

// ─── Modal: Transferir a otro local ───────────────────────────────────────────

export function TransferirModal({
  isDesktop, visible, onClose, onConfirmar,
  producto, cantidad, setCantidad, local, setLocal,
}) {
  if (!visible) return null;
  return (
    <ModalShell isDesktop={isDesktop} onClose={onClose} title="⇄  Transferir a otro local">
      <div className="gp-form-wrap">
        {producto && (
          <div className="gp-found-box roomy">
            <div className="gp-found-title" style={{ marginBottom: 4 }}>PRODUCTO</div>
            <div className="gp-found-name roomy">{producto.nombre}</div>
            <div className="gp-found-sub roomy">
              Stock disponible: {formatStock(producto.stock, producto.unidad || 'uds')}
            </div>
          </div>
        )}
        <FormField label="Local de destino *" value={local} onChangeText={setLocal} placeholder="Ej: Sucursal Centro" />
        <FormField
          label={`Cantidad a transferir (${producto?.unidad === 'g' ? 'gramos' : 'unidades'}) *`}
          value={cantidad}
          onChangeText={setCantidad}
          placeholder={producto?.unidad === 'g' ? 'Ej: 2000' : 'Ej: 10'}
          type="number"
        />
        <button className="gp-btn-primary" style={{ background: '#1A6FA8' }} onClick={onConfirmar}>
          Confirmar transferencia
        </button>
        <div style={{ height: 20 }} />
      </div>
    </ModalShell>
  );
}
