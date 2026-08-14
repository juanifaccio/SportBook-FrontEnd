import { Cancha } from './cancha';
import { Horario } from './horario';
import { Usuario } from './usuario';

/** Estados que acepta el enum `EstadoReserva` del backend. */
export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';

/** Etiquetas legibles de cada estado, para mostrarlas en la interfaz. */
export const ETIQUETAS_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada'
};

/** Reserva tal como la devuelve el backend. */
export interface Reserva {
  id: number;
  /** Día del turno en formato `AAAA-MM-DD`, sin hora ni huso horario. */
  fecha: string;
  /** Hora de inicio en formato `HH:mm`. */
  horaInicio: string;
  /** Hora de fin en formato `HH:mm`. */
  horaFin: string;
  estado: EstadoReserva;
  /** Precio por hora de la cancha por la duración del turno, calculado en el backend. */
  precioTotal: number;
  usuarioId: number;
  canchaId: number;
  horarioId: number;
  /** El backend incluye las tres relaciones, para no pedirlas reserva por reserva. */
  usuario?: Usuario;
  cancha?: Cancha;
  horario?: Horario;
}

/**
 * Datos que se envían al reservar.
 *
 * A diferencia del resto de los modelos, no es un `Omit<Reserva, 'id'>`: el
 * cliente manda solamente el turno y el usuario, y el backend deriva del turno
 * la fecha, las horas, la cancha, el estado y el precio. Un precio calculado en
 * el navegador no se puede creer, así que ni siquiera viaja.
 */
export interface ReservaDto {
  horarioId: number;
  usuarioId: number;
}

/** Filtros opcionales del listado de reservas. */
export interface FiltrosReserva {
  usuarioId?: number;
  canchaId?: number;
  /** Día en formato `AAAA-MM-DD`. */
  fecha?: string;
}
