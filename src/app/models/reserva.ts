import { Cancha } from './cancha';
import { Evento } from './evento';
import { Horario } from './horario';
import { Pago } from './pago';
import { EquipamientoPedido, ReservaEquipamiento } from './reserva-equipamiento';
import { Usuario } from './usuario';
import { formatearFecha } from '../core/fechas';

export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';

export const ETIQUETAS_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada'
};

export interface Reserva {
  id: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoReserva;
  precioTotal: number;
  usuarioId: number;
  canchaId: number;
  horarioId: number;
  usuario?: Usuario;
  cancha?: Cancha;
  horario?: Horario;
  evento?: Evento | null;
  pagos?: Pago[];
  equipamientos?: ReservaEquipamiento[];
}

export interface ReservaDto {
  horarioId: number;
  usuarioId?: number;
  equipamientos?: EquipamientoPedido[];
}

export interface ReprogramarDto {
  horarioId: number;
}

const nombreDeLaCancha = (cancha: Cancha): string =>
  cancha.tipoCancha ? `${cancha.nombre} (${cancha.tipoCancha.nombre})` : cancha.nombre;

export const etiquetaDeReserva = (reserva: Reserva): string => {
  const cancha = reserva.cancha ? ` · ${nombreDeLaCancha(reserva.cancha)}` : '';

  return `${formatearFecha(reserva.fecha)}, ${reserva.horaInicio} a ${reserva.horaFin}${cancha}`;
};

export const etiquetaDeReservaConUsuario = (reserva: Reserva): string => {
  const usuario = reserva.usuario ? ` · ${reserva.usuario.nombre}` : '';

  return `${etiquetaDeReserva(reserva)}${usuario}`;
};

export interface FiltrosReserva {
  usuarioId?: number;
  canchaId?: number;
  fecha?: string;
  estado?: EstadoReserva;
}
