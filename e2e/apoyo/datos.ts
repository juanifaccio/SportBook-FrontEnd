import { Cancha } from '../../src/app/models/cancha';
import { Evento } from '../../src/app/models/evento';
import { Horario } from '../../src/app/models/horario';
import { Reserva } from '../../src/app/models/reserva';
import { Rol } from '../../src/app/models/rol';
import { TipoCancha } from '../../src/app/models/tipo-cancha';
import { TipoEvento } from '../../src/app/models/tipo-evento';
import { Usuario } from '../../src/app/models/usuario';

/**
 * Los datos con los que arranca cada test.
 *
 * Se tipan con las mismas interfaces del dominio que usa la aplicación: si
 * alguna cambia y la API falsa deja de responder lo que el frontend espera, esto
 * no compila. Es la forma de que un doble no se vaya quedando viejo en silencio.
 *
 * Las entidades se guardan planas —sin las relaciones anidadas— y la API falsa
 * las arma al responder, igual que hace Prisma con sus `include`.
 */

/** Usuario tal como se guarda del lado del servidor: con la contraseña. */
export type UsuarioSembrado = Usuario & { contrasena: string };

/** Estado completo del servidor simulado. */
export interface EstadoApi {
  roles: Rol[];
  usuarios: UsuarioSembrado[];
  tiposCancha: TipoCancha[];
  tiposEvento: TipoEvento[];
  canchas: Cancha[];
  horarios: Horario[];
  reservas: Reserva[];
  eventos: Evento[];
}

/**
 * Un día relativo a hoy, como `"AAAA-MM-DD"`.
 *
 * Se arma con las partes locales de la fecha y no con `toISOString()`, por lo
 * mismo que `core/fechas.ts`: ese devuelve el día en UTC y a la tarde ya está
 * mostrando el de mañana.
 */
const dia = (desplazamiento: number): string => {
  const fecha = new Date();

  fecha.setDate(fecha.getDate() + desplazamiento);

  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const numero = `${fecha.getDate()}`.padStart(2, '0');

  return `${fecha.getFullYear()}-${mes}-${numero}`;
};

/**
 * Los turnos se siembran mañana y no hoy: una reserva que ya empezó no se puede
 * gestionar, y a media tarde la mitad de los turnos de hoy caerían en ese caso.
 * `AYER` existe justamente para probar el otro lado.
 */
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

/** En mantenimiento: la pantalla de reservar no tiene que ofrecerla. */
export const CANCHA_3: Cancha = {
  id: 3,
  nombre: 'Cancha 3',
  precioPorHora: 5000,
  estado: 'MANTENIMIENTO',
  tipoCanchaId: PADEL.id
};

/**
 * Turnos sembrados. Los tres primeros son los de la Cancha 1 de mañana, que es
 * lo que ve la pantalla de reservar al abrirse: dos libres y uno ya tomado.
 */
export const TURNOS: Horario[] = [
  { id: 1, fecha: MANANA, horaInicio: '10:00', horaFin: '11:00', disponible: true, canchaId: 1 },
  { id: 2, fecha: MANANA, horaInicio: '11:00', horaFin: '12:00', disponible: true, canchaId: 1 },
  { id: 3, fecha: MANANA, horaInicio: '18:00', horaFin: '19:00', disponible: false, canchaId: 1 },
  { id: 4, fecha: MANANA, horaInicio: '09:00', horaFin: '10:30', disponible: true, canchaId: 2 },
  { id: 5, fecha: MANANA, horaInicio: '20:00', horaFin: '21:00', disponible: false, canchaId: 2 },
  { id: 6, fecha: AYER, horaInicio: '10:00', horaFin: '11:00', disponible: false, canchaId: 1 },
  // Libre de nuevo: es el turno de la reserva #4, que está cancelada.
  { id: 7, fecha: MANANA, horaInicio: '08:00', horaFin: '09:00', disponible: true, canchaId: 2 }
];

/**
 * Reservas sembradas, una por cada situación que la pantalla de gestión tiene
 * que distinguir: dos vigentes de clientes distintos, una que ya empezó y una
 * cancelada.
 */
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
    estado: 'CONFIRMADA',
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
    estado: 'CONFIRMADA',
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

/**
 * Un solo evento sembrado, sobre la reserva #1 de Ana: alcanza para probar que
 * el listado lo muestra, que el detalle de esa reserva lo trae y que la #2 —sin
 * evento— sigue disponible para cargarle uno.
 */
export const EVENTOS: Evento[] = [
  {
    id: 1,
    descripcion: 'Cumpleaños de 15',
    cantidadPersonas: 40,
    tipoEventoId: CUMPLEANIOS.id,
    reservaId: 1
  }
];

/**
 * Una copia fresca del estado inicial.
 *
 * Se clona en cada llamada: los tests corren en paralelo y modifican lo que
 * tienen enfrente —crean, editan y borran—, así que compartir los objetos haría
 * que un test viera lo que hizo otro.
 */
export const datosIniciales = (): EstadoApi =>
  structuredClone({
    roles: [ROL_ADMIN, ROL_CLIENTE],
    usuarios: [ADMINISTRADOR, ANA, BRUNO],
    tiposCancha: [FUTBOL_5, PADEL],
    tiposEvento: [CUMPLEANIOS, TORNEO],
    canchas: [CANCHA_1, CANCHA_2, CANCHA_3],
    horarios: TURNOS,
    reservas: RESERVAS,
    eventos: EVENTOS
  });
