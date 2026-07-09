// ─── Catálogo de ingredientes ─────────────────────────────────────────────────
// Cada ingrediente define su `tipo` de medida:
//   - 'peso'   → el usuario ingresa un número libre y elige la unidad: g o kg
//   - 'volumen'→ el usuario ingresa un número libre y elige la unidad: ml o L
//   - 'unidad' → el usuario ingresa solo un número entero (sin conversión),
//                mostrado con la etiqueta singular/plural indicada.
// Esto reemplaza el antiguo esquema de "medidas" fijas (ej. '100gr','250gr'),
// que limitaba al usuario a un puñado de valores predefinidos.

export const INGREDIENTES_DB = [
  { nombre: 'Papa', tipo: 'peso' },
  { nombre: 'Pollo', tipo: 'peso' },
  { nombre: 'Carne Hamburguesa', tipo: 'peso' },
  { nombre: 'Salchicha', tipo: 'unidad', labelSingular: 'unidad', labelPlural: 'unidades' },
  { nombre: 'Huevo', tipo: 'unidad', labelSingular: 'unidad', labelPlural: 'unidades' },
  { nombre: 'Pan Hamburguesa', tipo: 'unidad', labelSingular: 'unidad', labelPlural: 'unidades' },
  { nombre: 'Queso', tipo: 'unidad', labelSingular: 'lámina', labelPlural: 'láminas' },
  { nombre: 'Jamón', tipo: 'peso' },
  { nombre: 'Tomate', tipo: 'peso' },
  { nombre: 'Cebolla', tipo: 'peso' },
  { nombre: 'Lechuga', tipo: 'peso' },
  { nombre: 'Palta', tipo: 'peso' },
  { nombre: 'Arroz', tipo: 'peso' },
  { nombre: 'Aceite', tipo: 'volumen' },
  { nombre: 'Mayonesa', tipo: 'volumen' },
  { nombre: 'Ketchup', tipo: 'volumen' },
  { nombre: 'Mostaza', tipo: 'volumen' },
  { nombre: 'Sal', tipo: 'peso' },
  { nombre: 'Bebida', tipo: 'volumen' },
  { nombre: 'Leche', tipo: 'volumen' },
  { nombre: 'Cafe', tipo: 'peso' },
  { nombre: 'Harina', tipo: 'peso' },
  { nombre: 'Mantequilla', tipo: 'peso' },
  { nombre: 'Agua', tipo: 'volumen' },
];

// Unidades seleccionables según el tipo de ingrediente
export const UNIDADES_POR_TIPO = {
  peso: ['g', 'kg'],
  volumen: ['ml', 'L'],
  unidad: ['un'],
};

// Unidad por defecto al elegir un ingrediente nuevo
export const UNIDAD_DEFAULT_POR_TIPO = {
  peso: 'g',
  volumen: 'ml',
  unidad: 'un',
};

// Gramos aproximados que equivalen a "1 unidad" de estos ingredientes por peso
// (se usa solo para mostrar un estimado de unidades en el detalle de la receta)
export const EQUIVALENCIAS = {
  Papa: 150,
  Tomate: 180,
  Cebolla: 120,
  Palta: 250,
  Lechuga: 300,
};

export const CATEGORIAS_RECETAS = [
  { nombre: 'Papas y frituras', items: ['Papas fritas', 'Papas con pollo', 'Salchipapas', 'Nuggets con papas'] },
  { nombre: 'Pollo', items: ['Pollo frito', 'Pollo al plato', 'Pollo con papas', 'Pollo con arroz'] },
  { nombre: 'Sandwiches', items: ['Sandwich de pollo', 'Sandwich de carne', 'Sandwich mixto'] },
  { nombre: 'Platos preparados', items: ['Pollo con arroz', 'Pollo con ensalada', 'Menu del dia'] },
  { nombre: 'Panaderia', items: ['Pan', 'Croissant', 'Tostadas', 'Sandwiches simples'] },
  { nombre: 'Pasteleria', items: ['Tortas', 'Kuchen', 'Muffins', 'Galletas'] },
  { nombre: 'Bebidas calientes', items: ['Cafe espresso', 'Cafe latte', 'Cappuccino', 'Te', 'Chocolate caliente'] },
  { nombre: 'Bebidas frias', items: ['Jugos', 'Batidos', 'Cafe frio'] },
];

// Nota: `imagen` usa un placeholder determinístico (picsum.photos) solo para
// demostrar la vista en cuadrícula. Reemplázalo por la foto real del plato
// cuando conectes datos reales.
// Cada ingrediente ahora es { nombre, cantidad, unidad } con cantidad numérica libre.
export const RECETAS_INICIALES = [
  {
    id: '1', nombre: 'Papas fritas', categoria: 'Papas y frituras', precio: 2500, activa: true,
    imagen: 'https://picsum.photos/seed/papas-fritas/300/300',
    ingredientes: [
      { nombre: 'Papa', cantidad: 500, unidad: 'g' },
      { nombre: 'Aceite', cantidad: 50, unidad: 'ml' },
      { nombre: 'Sal', cantidad: 5, unidad: 'g' },
    ],
  },
  {
    id: '2', nombre: 'Cappuccino', categoria: 'Bebidas calientes', precio: 3200, activa: true,
    imagen: 'https://picsum.photos/seed/cappuccino/300/300',
    ingredientes: [
      { nombre: 'Leche', cantidad: 250, unidad: 'ml' },
      { nombre: 'Cafe', cantidad: 30, unidad: 'g' },
    ],
  },
  {
    id: '3', nombre: 'Croissant', categoria: 'Panaderia', precio: 1800, activa: true,
    imagen: 'https://picsum.photos/seed/croissant/300/300',
    ingredientes: [
      { nombre: 'Harina', cantidad: 200, unidad: 'g' },
      { nombre: 'Mantequilla', cantidad: 50, unidad: 'g' },
    ],
  },

  // ─── PAPAS Y FRITURAS ─────────────────────────
  {
    id: '4', nombre: 'Salchipapas', categoria: 'Papas y frituras', precio: 4500, activa: true,
    imagen: 'https://picsum.photos/seed/salchipapas/300/300',
    ingredientes: [
      { nombre: 'Papa', cantidad: 500, unidad: 'g' },
      { nombre: 'Salchicha', cantidad: 2, unidad: 'un' },
      { nombre: 'Ketchup', cantidad: 30, unidad: 'ml' },
      { nombre: 'Mayonesa', cantidad: 30, unidad: 'ml' },
    ],
  },
  {
    id: '5', nombre: 'Nuggets con papas', categoria: 'Papas y frituras', precio: 5200, activa: true,
    imagen: 'https://picsum.photos/seed/nuggets-papas/300/300',
    ingredientes: [
      { nombre: 'Papa', cantidad: 500, unidad: 'g' },
      { nombre: 'Pollo', cantidad: 200, unidad: 'g' },
      { nombre: 'Aceite', cantidad: 50, unidad: 'ml' },
    ],
  },

  // ─── POLLO ────────────────────────────────────
  {
    id: '6', nombre: 'Pollo frito', categoria: 'Pollo', precio: 6500, activa: true,
    imagen: 'https://picsum.photos/seed/pollo-frito/300/300',
    ingredientes: [
      { nombre: 'Pollo', cantidad: 500, unidad: 'g' },
      { nombre: 'Aceite', cantidad: 100, unidad: 'ml' },
      { nombre: 'Sal', cantidad: 10, unidad: 'g' },
    ],
  },
  {
    id: '7', nombre: 'Pollo con arroz', categoria: 'Pollo', precio: 5900, activa: true,
    imagen: 'https://picsum.photos/seed/pollo-arroz/300/300',
    ingredientes: [
      { nombre: 'Pollo', cantidad: 500, unidad: 'g' },
      { nombre: 'Arroz', cantidad: 300, unidad: 'g' },
      { nombre: 'Sal', cantidad: 5, unidad: 'g' },
    ],
  },
  {
    id: '8', nombre: 'Pollo con papas', categoria: 'Pollo', precio: 6100, activa: true,
    imagen: 'https://picsum.photos/seed/pollo-papas/300/300',
    ingredientes: [
      { nombre: 'Pollo', cantidad: 500, unidad: 'g' },
      { nombre: 'Papa', cantidad: 500, unidad: 'g' },
    ],
  },

  // ─── SANDWICHES ───────────────────────────────
  {
    id: '9', nombre: 'Sandwich de pollo', categoria: 'Sandwiches', precio: 4200, activa: true,
    imagen: 'https://picsum.photos/seed/sandwich-pollo/300/300',
    ingredientes: [
      { nombre: 'Pollo', cantidad: 200, unidad: 'g' },
      { nombre: 'Tomate', cantidad: 100, unidad: 'g' },
      { nombre: 'Lechuga', cantidad: 50, unidad: 'g' },
      { nombre: 'Mayonesa', cantidad: 30, unidad: 'ml' },
    ],
  },
  {
    id: '10', nombre: 'Sandwich mixto', categoria: 'Sandwiches', precio: 3800, activa: true,
    imagen: 'https://picsum.photos/seed/sandwich-mixto/300/300',
    ingredientes: [
      { nombre: 'Jamón', cantidad: 100, unidad: 'g' },
      { nombre: 'Queso', cantidad: 2, unidad: 'un' },
      { nombre: 'Tomate', cantidad: 100, unidad: 'g' },
    ],
  },
  {
    id: '11', nombre: 'Hamburguesa clasica', categoria: 'Sandwiches', precio: 5600, activa: true,
    imagen: 'https://picsum.photos/seed/hamburguesa-clasica/300/300',
    ingredientes: [
      { nombre: 'Pan Hamburguesa', cantidad: 1, unidad: 'un' },
      { nombre: 'Carne Hamburguesa', cantidad: 150, unidad: 'g' },
      { nombre: 'Queso', cantidad: 1, unidad: 'un' },
      { nombre: 'Tomate', cantidad: 100, unidad: 'g' },
    ],
  },

  // ─── PLATOS PREPARADOS ────────────────────────
  {
    id: '12', nombre: 'Pollo con ensalada', categoria: 'Platos preparados', precio: 6200, activa: true,
    imagen: 'https://picsum.photos/seed/pollo-ensalada/300/300',
    ingredientes: [
      { nombre: 'Pollo', cantidad: 500, unidad: 'g' },
      { nombre: 'Tomate', cantidad: 200, unidad: 'g' },
      { nombre: 'Lechuga', cantidad: 100, unidad: 'g' },
      { nombre: 'Palta', cantidad: 100, unidad: 'g' },
    ],
  },
  {
    id: '13', nombre: 'Menu del dia', categoria: 'Platos preparados', precio: 7000, activa: true,
    imagen: 'https://picsum.photos/seed/menu-del-dia/300/300',
    ingredientes: [
      { nombre: 'Pollo', cantidad: 500, unidad: 'g' },
      { nombre: 'Arroz', cantidad: 300, unidad: 'g' },
      { nombre: 'Tomate', cantidad: 100, unidad: 'g' },
    ],
  },

  // ─── PANADERIA ────────────────────────────────
  {
    id: '14', nombre: 'Tostadas', categoria: 'Panaderia', precio: 1500, activa: true,
    imagen: 'https://picsum.photos/seed/tostadas/300/300',
    ingredientes: [
      { nombre: 'Pan Hamburguesa', cantidad: 2, unidad: 'un' },
      { nombre: 'Mantequilla', cantidad: 50, unidad: 'g' },
    ],
  },
  {
    id: '15', nombre: 'Pan amasado', categoria: 'Panaderia', precio: 1200, activa: true,
    imagen: 'https://picsum.photos/seed/pan-amasado/300/300',
    ingredientes: [
      { nombre: 'Harina', cantidad: 200, unidad: 'g' },
      { nombre: 'Aceite', cantidad: 10, unidad: 'ml' },
    ],
  },

  // ─── PASTELERIA ───────────────────────────────
  {
    id: '16', nombre: 'Muffins', categoria: 'Pasteleria', precio: 2200, activa: true,
    imagen: 'https://picsum.photos/seed/muffins/300/300',
    ingredientes: [
      { nombre: 'Harina', cantidad: 200, unidad: 'g' },
      { nombre: 'Huevo', cantidad: 2, unidad: 'un' },
    ],
  },
  {
    id: '17', nombre: 'Galletas', categoria: 'Pasteleria', precio: 1800, activa: true,
    imagen: 'https://picsum.photos/seed/galletas/300/300',
    ingredientes: [
      { nombre: 'Harina', cantidad: 200, unidad: 'g' },
      { nombre: 'Huevo', cantidad: 1, unidad: 'un' },
    ],
  },
  {
    id: '18', nombre: 'Kuchen de manzana', categoria: 'Pasteleria', precio: 3500, activa: true,
    imagen: 'https://picsum.photos/seed/kuchen-manzana/300/300',
    ingredientes: [
      { nombre: 'Harina', cantidad: 300, unidad: 'g' },
      { nombre: 'Huevo', cantidad: 3, unidad: 'un' },
    ],
  },

  // ─── BEBIDAS CALIENTES ────────────────────────
  {
    id: '19', nombre: 'Cafe espresso', categoria: 'Bebidas calientes', precio: 2500, activa: true,
    imagen: 'https://picsum.photos/seed/cafe-espresso/300/300',
    ingredientes: [{ nombre: 'Cafe', cantidad: 30, unidad: 'g' }],
  },
  {
    id: '20', nombre: 'Chocolate caliente', categoria: 'Bebidas calientes', precio: 3400, activa: true,
    imagen: 'https://picsum.photos/seed/chocolate-caliente/300/300',
    ingredientes: [{ nombre: 'Leche', cantidad: 250, unidad: 'ml' }],
  },
  {
    id: '21', nombre: 'Te', categoria: 'Bebidas calientes', precio: 1800, activa: true,
    imagen: 'https://picsum.photos/seed/te/300/300',
    ingredientes: [{ nombre: 'Agua', cantidad: 250, unidad: 'ml' }],
  },

  // ─── BEBIDAS FRIAS ────────────────────────────
  {
    id: '22', nombre: 'Jugo natural', categoria: 'Bebidas frias', precio: 2800, activa: true,
    imagen: 'https://picsum.photos/seed/jugo-natural/300/300',
    ingredientes: [{ nombre: 'Bebida', cantidad: 500, unidad: 'ml' }],
  },
  {
    id: '23', nombre: 'Batido de frutas', categoria: 'Bebidas frias', precio: 3900, activa: true,
    imagen: 'https://picsum.photos/seed/batido-frutas/300/300',
    ingredientes: [
      { nombre: 'Leche', cantidad: 250, unidad: 'ml' },
      { nombre: 'Palta', cantidad: 100, unidad: 'g' },
    ],
  },
  {
    id: '24', nombre: 'Cafe frio', categoria: 'Bebidas frias', precio: 3500, activa: true,
    imagen: 'https://picsum.photos/seed/cafe-frio/300/300',
    ingredientes: [
      { nombre: 'Cafe', cantidad: 30, unidad: 'g' },
      { nombre: 'Leche', cantidad: 250, unidad: 'ml' },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getIngredienteMeta(nombre) {
  return INGREDIENTES_DB.find((i) => i.nombre === nombre) || { tipo: 'peso' };
}

// Convierte una cantidad+unidad de un ingrediente de tipo 'peso' o 'volumen' a
// su unidad base (gramos o mililitros) para poder compararla/sumarla.
export function aUnidadBase(cantidad, unidad) {
  if (unidad === 'kg' || unidad === 'L') return cantidad * 1000;
  return cantidad;
}

// Texto legible para un ingrediente de receta: "500 g", "0.5 kg", "2 láminas"...
export function formatCantidadIngrediente(ing) {
  const meta = getIngredienteMeta(ing.nombre);
  if (meta.tipo === 'unidad') {
    const singular = meta.labelSingular || 'unidad';
    const plural = meta.labelPlural || 'unidades';
    return `${ing.cantidad} ${ing.cantidad === 1 ? singular : plural}`;
  }
  return `${ing.cantidad} ${ing.unidad}`;
}

// Estimado de unidades físicas para ingredientes de peso con equivalencia
// conocida (ej. "500 g de Papa" → "aprox. 3 unidades")
export function calcularUnidadesAprox(ing) {
  const meta = getIngredienteMeta(ing.nombre);
  if (meta.tipo !== 'peso') return null;
  const equivalencia = EQUIVALENCIAS[ing.nombre];
  if (!equivalencia) return null;
  const gramos = aUnidadBase(ing.cantidad, ing.unidad);
  const unidades = Math.round(gramos / equivalencia);
  if (unidades <= 0) return null;
  return `aprox. ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`;
}
