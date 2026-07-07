// models/EmpleadoModel.js

export class EmpleadoModel {
  constructor({
    id                 = null,
    nombre             = '',
    rut                = '',
    rol                = 'cajero',
    localAsignado      = {},
    turno              = 'dia',
    telefono           = '',
    email              = '',
    fechaIngreso       = null,
    activo             = true,
    restriccionHorario = true,
    sesionActiva       = false,   // ← nuevo
    ultimaConexion     = null,
    actualizadoEn      = null,
  }) {
    this.id                = id;
    this.nombre            = nombre.trim();
    this.rut               = rut.trim();
    this.rol               = rol;
    this.localAsignado     = (localAsignado && typeof localAsignado === 'object' && !Array.isArray(localAsignado))
      ? localAsignado
      : {};
    this.turno             = turno;
    this.telefono          = telefono.trim();
    this.email             = email.trim().toLowerCase();
    this.fechaIngreso      = fechaIngreso ?? new Date().toISOString().split('T')[0];
    this.activo            = activo;
    this.restriccionHorario = restriccionHorario;
    this.sesionActiva      = sesionActiva;            // ← nuevo
    this.ultimaConexion    = ultimaConexion ?? null;
    this.actualizadoEn     = new Date().toISOString();
  }

  /**
   * Devuelve solo los nombres de los locales que están marcados en `true`
   * dentro de `localAsignado`. Útil donde antes se usaba el array `locales`
   * (por ejemplo, para tomar "el primer local asignado").
   * @returns {string[]}
   */
  getLocalesAsignados() {
    return Object.entries(this.localAsignado)
      .filter(([, asignado]) => asignado === true)
      .map(([nombre]) => nombre);
  }

  toFirebase() {
    return {
      nombre:             this.nombre,
      rut:                this.rut,
      rol:                this.rol,
      localAsignado:      this.localAsignado,
      turno:              this.turno,
      telefono:           this.telefono,
      email:              this.email,
      fechaIngreso:       this.fechaIngreso,
      activo:             this.activo,
      restriccionHorario: this.restriccionHorario,
      sesionActiva:       this.sesionActiva,          // ← nuevo
      ultimaConexion:     this.ultimaConexion,
      actualizadoEn:      this.actualizadoEn,
    };
  }

  static fromFirebase(firebaseKey, data) {
    return new EmpleadoModel({
      id:                firebaseKey,
      nombre:            data.nombre             ?? '',
      rut:               data.rut                ?? '',
      rol:               data.rol                ?? 'cajero',
      localAsignado:     data.localAsignado       ?? {},
      turno:             data.turno               ?? 'dia',
      telefono:          data.telefono            ?? '',
      email:             data.email               ?? '',
      fechaIngreso:      data.fechaIngreso        ?? null,
      activo:            data.activo              ?? true,
      restriccionHorario: data.restriccionHorario ?? true,
      sesionActiva:      data.sesionActiva        ?? false,  // ← nuevo
      ultimaConexion:    data.ultimaConexion       ?? null,
      actualizadoEn:     data.actualizadoEn        ?? null,
    });
  }
}