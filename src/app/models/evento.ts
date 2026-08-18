import { Reserva } from './reserva';
import { TipoEvento } from './tipo-evento';

/** Evento tal como lo devuelve el backend. */
export interface Evento {
  id: number;
  descripcion: string;
  /** Cuánta gente va. El backend exige un entero mayor a cero. */
  cantidadPersonas: number;
  tipoEventoId: number;
  reservaId: number;
  /** El backend incluye las dos relaciones, para no pedirlas evento por evento. */
  tipoEvento?: TipoEvento;
  reserva?: Reserva;
}

/**
 * Datos que se envían al cargarle el evento a una reserva. El `id` lo asigna el
 * backend, y las relaciones incluidas no forman parte del cuerpo del request.
 */
export type EventoDto = Omit<Evento, 'id' | 'tipoEvento' | 'reserva'>;

/**
 * Datos que se envían al editar.
 *
 * Va sin `reservaId` porque mover un evento de una reserva a otra no es una
 * operación del negocio: el backend lo ignora si viene, y el formulario muestra
 * la reserva como un dato fijo cuando está editando.
 */
export type EventoEdicionDto = Omit<EventoDto, 'reservaId'>;

/** Filtros opcionales del listado de eventos. */
export interface FiltrosEvento {
  reservaId?: number;
}
