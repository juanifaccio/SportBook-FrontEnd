import { Cancha } from './cancha';
import { Evento } from './evento';
import { Horario } from './horario';
import { Pago } from './pago';
import { Usuario } from './usuario';
import { formatearFecha } from '../core/fechas';

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
  /**
   * El evento de la reserva, si tiene. Viene `null` en la mayoría, que son un
   * partido y nada más; por eso además de opcional puede llegar nulo.
   */
  evento?: Evento | null;
  /** Los cobros de la reserva, incluidos los anulados. */
  pagos?: Pago[];
}

/**
 * Datos que se envían al reservar.
 *
 * A diferencia del resto de los modelos, no es un `Omit<Reserva, 'id'>`: se manda
 * solamente el turno, y el backend deriva de él la fecha, las horas, la cancha,
 * el estado y el precio. Un precio calculado en el navegador no se puede creer,
 * así que ni siquiera viaja.
 */
export interface ReservaDto {
  horarioId: number;
  /**
   * A nombre de quién va. Opcional porque solo lo manda un administrador, que
   * reserva desde el mostrador para otro: al cliente el backend le impone el
   * usuario de su sesión, y mandarlo no cambiaría nada.
   */
  usuarioId?: number;
}

/**
 * Datos que se envían al reprogramar.
 *
 * Lo único modificable de una reserva es el turno: la fecha, las horas, la
 * cancha y el precio se vuelven a copiar del turno nuevo en el backend, igual
 * que en el alta.
 */
export interface ReprogramarDto {
  horarioId: number;
}

/**
 * Cómo se nombra una reserva cuando hay que elegirla de una lista o
 * identificarla en una fila: el día, el horario y la cancha alcanzan para
 * distinguirla de las demás.
 */
export const etiquetaDeReserva = (reserva: Reserva): string => {
  const cancha = reserva.cancha ? ` · ${reserva.cancha.nombre}` : '';

  return `${formatearFecha(reserva.fecha)}, ${reserva.horaInicio} a ${reserva.horaFin}${cancha}`;
};

/**
 * La misma etiqueta, pero con a nombre de quién va la reserva.
 *
 * Es la que se usa cuando quien elige de la lista es un administrador y las
 * reservas son de distintas personas: el día, el horario y la cancha alcanzan
 * para distinguir una reserva de otra, pero no para saber a quién se le está
 * cobrando. El nombre se agrega solo si el backend incluyó el usuario.
 */
export const etiquetaDeReservaConUsuario = (reserva: Reserva): string => {
  const usuario = reserva.usuario ? ` · ${reserva.usuario.nombre}` : '';

  return `${etiquetaDeReserva(reserva)}${usuario}`;
};

/** Filtros opcionales del listado de reservas. */
export interface FiltrosReserva {
  usuarioId?: number;
  canchaId?: number;
  /** Día en formato `AAAA-MM-DD`. */
  fecha?: string;
  estado?: EstadoReserva;
}
