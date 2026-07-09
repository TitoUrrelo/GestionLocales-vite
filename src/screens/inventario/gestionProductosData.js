// ─── Datos de ejemplo ────────────────────────────────────────────────────────


export const PRODUCTOS_INICIALES = [
  {
    id: '1',
    nombre: 'Arroz Premium',
    codigo: '7891234560012',
    categoria: 'Abarrotes',
    proveedor: 'Distribuidora Norte',
    precio: 890,      // $ por kg (1000g)
    stock: 142000,    // gramos
    minimo: 30000,
    unidad: 'g',
    activo: true,
    ultima: '28 abr 2025',
    imagen: 'https://picsum.photos/seed/arroz-premium/300/300',
  },
  {
    id: '2',
    nombre: 'Aceite Vegetal',
    codigo: '7802800100036',
    categoria: 'Abarrotes',
    proveedor: 'Alimarket SpA',
    precio: 2450,
    stock: 18,
    minimo: 20,
    unidad: 'uds',
    activo: true,
    ultima: '25 abr 2025',
    imagen: 'https://picsum.photos/seed/aceite-vegetal/300/300',
  },
  {
    id: '3',
    nombre: 'Leche Entera 1L',
    codigo: '7802800200018',
    categoria: 'Lácteos',
    proveedor: 'Colún',
    precio: 990,
    stock: 0,
    minimo: 40,
    unidad: 'uds',
    activo: true,
    ultima: '29 abr 2025',
    imagen: 'https://picsum.photos/seed/leche-entera/300/300',
  },
  {
    id: '4',
    nombre: 'Detergente',
    codigo: '4005808224067',
    categoria: 'Limpieza',
    proveedor: 'Procter & Gamble',
    precio: 3800,
    stock: 55,
    minimo: 15,
    unidad: 'uds',
    activo: false,
    ultima: '20 abr 2025',
    imagen: 'https://picsum.photos/seed/detergente/300/300',
  },
  {
    id: '5',
    nombre: 'Queso Gauda',
    codigo: '7802800050014',
    categoria: 'Lácteos',
    proveedor: 'Soprole',
    precio: 12000,    // $ por kg (1000g)
    stock: 8500,      // gramos
    minimo: 2000,
    unidad: 'g',
    activo: true,
    ultima: '27 abr 2025',
    imagen: 'https://picsum.photos/seed/queso-gauda/300/300',
  },
];

export const HISTORIALES = {
  '1': [
    { tipo: 'Ingreso de mercadería', fecha: '28 abr 2025', qty: '+50000', pos: true },
    { tipo: 'Ingreso de mercadería', fecha: '01 abr 2025', qty: '+100000', pos: true },
  ],
  '2': [
    { tipo: 'Ingreso de mercadería', fecha: '25 abr 2025', qty: '+30', pos: true },
    { tipo: 'Devolución de cliente', fecha: '10 abr 2025', qty: '+2', pos: true },
  ],
  '3': [
    { tipo: 'Ingreso de mercadería', fecha: '29 abr 2025', qty: '+80', pos: true },
    { tipo: 'Devolución de cliente', fecha: '18 abr 2025', qty: '+5', pos: true },
  ],
  '4': [{ tipo: 'Ingreso de mercadería', fecha: '20 abr 2025', qty: '+40', pos: true }],
  '5': [
    { tipo: 'Ingreso de mercadería', fecha: '27 abr 2025', qty: '+10000', pos: true },
    { tipo: 'Devolución de cliente', fecha: '05 abr 2025', qty: '+500', pos: true },
  ],
};

export const CATEGORIAS = ['Abarrotes', 'Lácteos', 'Bebidas', 'congelados', 'Limpieza', 'Otros'];
export const TIPOS_MOVIMIENTO = ['Ingreso de mercadería', 'Devolución de cliente'];
// Categorías que NO requieren fecha de vencimiento
export const CATEGORIAS_SIN_VENC = ['Limpieza', 'Otros'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getStockStatus(stock, minimo) {
  if (stock === 0) return 'out';
  if (stock <= minimo) return 'low';
  return 'ok';
}

export function formatStock(stock, unidad) {
  if (unidad === 'g') {
    if (stock >= 1000) return (stock / 1000).toFixed(2).replace(/\.?0+$/, '') + ' kg';
    return stock + ' g';
  }
  return stock + ' uds.';
}

export function formatPrecio(precio, unidad) {
  const base = '$' + precio.toLocaleString('es-CL');
  return unidad === 'g' ? base + ' / kg' : base;
}

export function requiereFechaVenc(categoria) {
  return !CATEGORIAS_SIN_VENC.includes(categoria);
}

export function formatQtyHistorial(qty, unidad) {
  const sign = qty[0];
  const num = parseInt(qty.slice(1));
  if (unidad === 'g') {
    if (num >= 1000) return sign + (num / 1000).toFixed(2).replace(/\.?0+$/, '') + ' kg';
    return sign + num + ' g';
  }
  return qty + ' uds.';
}
