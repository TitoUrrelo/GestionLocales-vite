// screens/inventario/inventarioData.js
// Datos mock y constantes compartidas entre las vistas de inventario.
// TODO: cuando conectemos a la base de datos real, reemplazar estos
// arrays por datos que vengan de Firebase (RTDB/Firestore).

export const DIAS    = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const HOY_IDX = new Date().getDay();

export const STOCK_DATA = [
  { id: '1', nombre: 'Pollo (kg)',        local: 'comidaRapida',    qty: 0.5, min: 5,   max: 20,  unit: 'kg' },
  { id: '2', nombre: 'Pan de completo',   local: 'comidaRapida',    qty: 8,   min: 30,  max: 100, unit: 'un' },
  { id: '3', nombre: 'Carne molida (kg)', local: 'comidaRapida',    qty: 1.2, min: 4,   max: 15,  unit: 'kg' },
  { id: '4', nombre: 'Aceite (lt)',       local: 'cafeteria', qty: 0.3, min: 2,   max: 8,   unit: 'lt' },
  { id: '5', nombre: 'Harina (kg)',       local: 'cafeteria', qty: 3.5, min: 5,   max: 25,  unit: 'kg' },
  { id: '6', nombre: 'Café (kg)',         local: 'cafeteria', qty: 0.4, min: 1.5, max: 5,   unit: 'kg' },
  { id: '7', nombre: 'Azúcar (kg)',       local: 'almacen',   qty: 2.1, min: 3,   max: 20,  unit: 'kg' },
  { id: '8', nombre: 'Arroz (kg)',        local: 'almacen',   qty: 12,  min: 5,   max: 30,  unit: 'kg' },
  { id: '9', nombre: 'Tomate (kg)',       local: 'almacen',   qty: 4.8, min: 3,   max: 15,  unit: 'kg' },
];

export const VENCIMIENTOS_DATA = [
  { id: 'v1', nombre: 'Leche descremada', local: 'cafeteria', vence: 1, unit: 'día',  qty: 6,  unitQty: 'lt', lote: 'L-2024-087' },
  { id: 'v2', nombre: 'Queso laminado',   local: 'comidaRapida',    vence: 2, unit: 'días', qty: 12, unitQty: 'un', lote: 'L-2024-112' },
  { id: 'v3', nombre: 'Yogur natural',    local: 'almacen',   vence: 2, unit: 'días', qty: 8,  unitQty: 'un', lote: 'L-2024-095' },
  { id: 'v4', nombre: 'Crema de leche',   local: 'cafeteria', vence: 4, unit: 'días', qty: 3,  unitQty: 'lt', lote: 'L-2024-101' },
  { id: 'v5', nombre: 'Jamón serrano',    local: 'comidaRapida',    vence: 5, unit: 'días', qty: 2,  unitQty: 'kg', lote: 'L-2024-088' },
  { id: 'v6', nombre: 'Mantequilla',      local: 'almacen',   vence: 6, unit: 'días', qty: 4,  unitQty: 'un', lote: 'L-2024-099' },
  { id: 'v7', nombre: 'Huevos frescos',   local: 'comidaRapida',    vence: 7, unit: 'días', qty: 30, unitQty: 'un', lote: 'L-2024-110' },
];

export const RECETAS_DATA_INIT = [
  { id: 'r1', nombre: 'Hamburguesa clásica', local: 'comidaRapida',    activa: true  },
  { id: 'r2', nombre: 'Hot dog completo',    local: 'comidaRapida',    activa: true  },
  { id: 'r3', nombre: 'Café americano',      local: 'cafeteria', activa: true  },
  { id: 'r4', nombre: 'Capuchino',           local: 'cafeteria', activa: true  },
  { id: 'r5', nombre: 'Ensalada mixta',      local: 'almacen',   activa: false },
  { id: 'r6', nombre: 'Sándwich de pollo',   local: 'comidaRapida',    activa: false },
];

export const PRODUCTOS_DATA_INIT = [
  { id: 'pr1', nombre: 'Pollo (kg)',        local: 'comidaRapida',    activo: true  },
  { id: 'pr2', nombre: 'Pan de completo',   local: 'comidaRapida',    activo: false },
  { id: 'pr3', nombre: 'Carne molida (kg)', local: 'comidaRapida',    activo: true  },
  { id: 'pr4', nombre: 'Aceite (lt)',       local: 'cafeteria', activo: true  },
  { id: 'pr5', nombre: 'Harina (kg)',       local: 'cafeteria', activo: false },
  { id: 'pr6', nombre: 'Café (kg)',         local: 'cafeteria', activo: true  },
  { id: 'pr7', nombre: 'Azúcar (kg)',       local: 'almacen',   activo: false },
  { id: 'pr8', nombre: 'Arroz (kg)',        local: 'almacen',   activo: true  },
  { id: 'pr9', nombre: 'Tomate (kg)',       local: 'almacen',   activo: true  },
];

export const PROVEEDORES_INIT = [
  { id: 'p1', nombre: 'Distribuidora El Pollo', initials: 'DP', empresa: 'El Pollo SpA',    tipo: 'Carnes y aves',       locales: ['comidaRapida'],               dias: [1, 4],    contacto: 'Juan Pérez',  telefono: '+56 9 1234 5678' },
  { id: 'p2', nombre: 'Pan & Co.',              initials: 'PC', empresa: 'Pan & Co.',        tipo: 'Pan y masas',         locales: ['comidaRapida', 'cafeteria'],  dias: [2, 5],    contacto: 'María López', telefono: '+56 9 8765 4321' },
  { id: 'p3', nombre: 'Almacén Santiago SpA',   initials: 'AS', empresa: 'Santiago SpA',     tipo: 'Abarrotes generales', locales: ['almacen', 'cafeteria'], dias: [1, 3, 5], contacto: 'Carlos Ruiz', telefono: '+56 9 5555 1234' },
  { id: 'p4', nombre: 'Café & Co.',             initials: 'CC', empresa: 'Café & Co. Ltda.', tipo: 'Insumos cafetería',   locales: ['cafeteria'],            dias: [3],       contacto: 'Ana Soto',    telefono: '+56 9 9999 8888' },
];

// Datos de inventario reciente (se reinician cada día)
export const TODAY_KEY = new Date().toISOString().split('T')[0];
export const INVENTARIO_RECIENTE_INIT = [
  { id: 'ir1', nombre: 'Pollo (kg)', cantidad: 10, unit: 'kg', local: 'comidaRapida',    hora: '08:30', fecha: TODAY_KEY },
  { id: 'ir2', nombre: 'Café (kg)',  cantidad: 5,  unit: 'kg', local: 'cafeteria', hora: '09:15', fecha: TODAY_KEY },
];

export const LOCAL_LABELS = { comidaRapida: 'Comida Rápida', almacen: 'Almacén', cafeteria: 'Cafetería' };

export const LOCAL_COLORS = {
  comidaRapida:    { bg: '#E6F1FB', text: '#0C447C', dot: '#378ADD' },
  almacen:   { bg: '#EAF3DE', text: '#27500A', dot: '#639922' },
  cafeteria: { bg: '#FAEEDA', text: '#633806', dot: '#BA7517' },
};

export const LOCALES_LIST = ['comidaRapida', 'almacen', 'cafeteria'];

// lib: 'mci' se traduce a react-icons/md al construir el sidebar (Parte 2)
export const LOCAL_ICONS = {
  comidaRapida:    { icon: 'food',                    lib: 'mci' },
  almacen:   { icon: 'package-variant-closed',  lib: 'mci' },
  cafeteria: { icon: 'coffee',                  lib: 'mci' },
};

export const DIAS_SEMANA = [
  { idx: 1, label: 'Lun' },
  { idx: 2, label: 'Mar' },
  { idx: 3, label: 'Mié' },
  { idx: 4, label: 'Jue' },
  { idx: 5, label: 'Vie' },
  { idx: 6, label: 'Sáb' },
  { idx: 0, label: 'Dom' },
];
