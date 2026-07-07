export const rutasPorLocal = {
  almacen: 'almacen',
  cafeteria: 'cafeteria',
  comida_rapida: 'comida_rapida',
};

export const opcionesRol = [
  { value: 'admin', label: 'Admin', rol: 'admin', local: 'Administrador' },
  { value: 'delivery', label: 'Delivery', rol: 'delivery', local: 'delivery' },
  { value: 'cajero_almacen', label: 'Cajero (almacen)', rol: 'cajero', local: 'almacen' },
  { value: 'cajero_cafeteria', label: 'Cajero (cafeteria)', rol: 'cajero', local: 'cafeteria' },
  { value: 'cajero_comida_rapida', label: 'Cajero (comida rapida)', rol: 'cajero', local: 'comida_rapida' },
];

export const obtenerOpcionRol = (value) => {
  return opcionesRol.find((opcion) => opcion.value === value) || opcionesRol[2];
};

export const obtenerVistaInicial = (usuario) => {
  if (!usuario) return 'login';
  if (usuario.rol === 'admin') return 'portal';
  if (usuario.rol === 'delivery') return 'delivery';
  return rutasPorLocal[usuario.local] || 'almacen';
};

export const rutConFormatoValido = (rut) => {
  return /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(rut.trim());
};

export const rutValido = (rut) => {
  if (!rutConFormatoValido(rut)) return false;

  const [numeroConPuntos, digitoIngresado] = rut.trim().split('-');
  const numero = numeroConPuntos.replaceAll('.', '');
  let suma = 0;
  let multiplicador = 2;

  for (let i = numero.length - 1; i >= 0; i -= 1) {
    suma += Number(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  const digitoCalculado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);

  return digitoCalculado === digitoIngresado.toUpperCase();
};

export const cerrarSesion = (navigate) => {
  localStorage.removeItem('sesion');
  navigate('login');
};
