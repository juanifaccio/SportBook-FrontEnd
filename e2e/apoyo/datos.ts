import { Cancha } from '../../src/app/models/cancha';
import { Equipamiento } from '../../src/app/models/equipamiento';
import { Evento } from '../../src/app/models/evento';
import { Horario } from '../../src/app/models/horario';
import { Pago } from '../../src/app/models/pago';
import { Reserva } from '../../src/app/models/reserva';
import { ReservaEquipamiento } from '../../src/app/models/reserva-equipamiento';
import { Rol } from '../../src/app/models/rol';
import { TipoCancha } from '../../src/app/models/tipo-cancha';
import { TipoEvento } from '../../src/app/models/tipo-evento';
import { Usuario } from '../../src/app/models/usuario';

export type UsuarioSembrado = Usuario & { contrasena: string };

export interface EstadoApi {
  roles: Rol[];
  usuarios: UsuarioSembrado[];
  tiposCancha: TipoCancha[];
  tiposEvento: TipoEvento[];
  equipamientos: Equipamiento[];
  canchas: Cancha[];
  horarios: Horario[];
  reservas: Reserva[];
  eventos: Evento[];
  pagos: Pago[];
  reservaEquipamientos: ReservaEquipamiento[];
}

const dia = (desplazamiento: number): string => {
  const fecha = new Date();

  fecha.setDate(fecha.getDate() + desplazamiento);

  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const numero = `${fecha.getDate()}`.padStart(2, '0');

  return `${fecha.getFullYear()}-${mes}-${numero}`;
};

export const MANANA = dia(1);
export const AYER = dia(-1);

export const ROL_ADMIN: Rol = { id: 1, nombre: 'ADMIN' };
export const ROL_CLIENTE: Rol = { id: 2, nombre: 'CLIENTE' };

export const ADMINISTRADOR: UsuarioSembrado = {
  id: 1,
  nombre: 'Lucía Prieto',
  email: 'admin@sportbook.test',
  telefono: '3415550001',
  activo: true,
  rolId: ROL_ADMIN.id,
  rol: ROL_ADMIN,
  contrasena: 'admin123'
};

export const ANA: UsuarioSembrado = {
  id: 2,
  nombre: 'Ana Gómez',
  email: 'ana@sportbook.test',
  telefono: '3415550002',
  activo: true,
  rolId: ROL_CLIENTE.id,
  rol: ROL_CLIENTE,
  contrasena: 'ana12345'
};

export const BRUNO: UsuarioSembrado = {
  id: 3,
  nombre: 'Bruno Sosa',
  email: 'bruno@sportbook.test',
  telefono: '3415550003',
  activo: true,
  rolId: ROL_CLIENTE.id,
  rol: ROL_CLIENTE,
  contrasena: 'bruno123'
};

export const FUTBOL_5: TipoCancha = {
  id: 1,
  nombre: 'Fútbol 5',
  descripcion: 'Césped sintético con iluminación'
};

export const PADEL: TipoCancha = {
  id: 2,
  nombre: 'Pádel',
  descripcion: 'Muro de vidrio y césped sintético'
};

export const PELOTA: Equipamiento = {
  id: 1,
  nombre: 'Pelota de fútbol',
  descripcion: 'Número 5, de cuero sintético',
  precio: 1500,
  stock: 10
};

export const PECHERAS: Equipamiento = {
  id: 2,
  nombre: 'Juego de pecheras',
  descripcion: 'Diez unidades, talle único',
  precio: 800,
  stock: 0
};

export const CANCHA_1: Cancha = {
  id: 1,
  nombre: 'Cancha 1',
  precioPorHora: 8000,
  estado: 'DISPONIBLE',
  tipoCanchaId: FUTBOL_5.id
};

export const CANCHA_2: Cancha = {
  id: 2,
  nombre: 'Cancha 2',
  precioPorHora: 6000,
  estado: 'DISPONIBLE',
  tipoCanchaId: PADEL.id
};

export const CANCHA_3: Cancha = {
  id: 3,
  nombre: 'Cancha 3',
  precioPorHora: 5000,
  estado: 'MANTENIMIENTO',
  tipoCanchaId: PADEL.id
};

export const TURNOS: Horario[] = [
  { id: 1, fecha: MANANA, horaInicio: '10:00', horaFin: '11:00', disponible: true, canchaId: 1 },
  { id: 2, fecha: MANANA, horaInicio: '11:00', horaFin: '12:00', disponible: true, canchaId: 1 },
  { id: 3, fecha: MANANA, horaInicio: '18:00', horaFin: '19:00', disponible: false, canchaId: 1 },
  { id: 4, fecha: MANANA, horaInicio: '09:00', horaFin: '10:30', disponible: true, canchaId: 2 },
  { id: 5, fecha: MANANA, horaInicio: '20:00', horaFin: '21:00', disponible: false, canchaId: 2 },
  { id: 6, fecha: AYER, horaInicio: '10:00', horaFin: '11:00', disponible: false, canchaId: 1 },
  { id: 7, fecha: MANANA, horaInicio: '08:00', horaFin: '09:00', disponible: true, canchaId: 2 }
];

export const RESERVAS: Reserva[] = [
  {
    id: 1,
    fecha: MANANA,
    horaInicio: '18:00',
    horaFin: '19:00',
    estado: 'CONFIRMADA',
    precioTotal: 8000,
    usuarioId: ANA.id,
    canchaId: CANCHA_1.id,
    horarioId: 3
  },
  {
    id: 2,
    fecha: MANANA,
    horaInicio: '20:00',
    horaFin: '21:00',
    estado: 'PENDIENTE',
    precioTotal: 6000,
    usuarioId: BRUNO.id,
    canchaId: CANCHA_2.id,
    horarioId: 5
  },
  {
    id: 3,
    fecha: AYER,
    horaInicio: '10:00',
    horaFin: '11:00',
    estado: 'PENDIENTE',
    precioTotal: 8000,
    usuarioId: ANA.id,
    canchaId: CANCHA_1.id,
    horarioId: 6
  },
  {
    id: 4,
    fecha: MANANA,
    horaInicio: '08:00',
    horaFin: '09:00',
    estado: 'CANCELADA',
    precioTotal: 6000,
    usuarioId: ANA.id,
    canchaId: CANCHA_2.id,
    horarioId: 7
  }
];

export const CUMPLEANIOS: TipoEvento = { id: 1, nombre: 'Cumpleaños' };
export const TORNEO: TipoEvento = { id: 2, nombre: 'Torneo' };

export const EVENTOS: Evento[] = [
  {
    id: 1,
    descripcion: 'Cumpleaños de 15',
    cantidadPersonas: 40,
    tipoEventoId: CUMPLEANIOS.id,
    reservaId: 1
  }
];

export const PAGOS: Pago[] = [
  {
    id: 1,
    monto: 8000,
    fecha: MANANA,
    metodo: 'EFECTIVO',
    estado: 'REGISTRADO',
    reservaId: 1
  }
];

export const datosIniciales = (): EstadoApi =>
  structuredClone({
    roles: [ROL_ADMIN, ROL_CLIENTE],
    usuarios: [ADMINISTRADOR, ANA, BRUNO],
    tiposCancha: [FUTBOL_5, PADEL],
    tiposEvento: [CUMPLEANIOS, TORNEO],
    equipamientos: [PECHERAS, PELOTA],
    canchas: [CANCHA_1, CANCHA_2, CANCHA_3],
    horarios: TURNOS,
    reservas: RESERVAS,
    eventos: EVENTOS,
    pagos: PAGOS,
    reservaEquipamientos: []
  });
