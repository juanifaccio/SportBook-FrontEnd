import { Reserva } from './reserva';
import { TipoEvento } from './tipo-evento';

export interface Evento {
  id: number;
  descripcion: string;
  cantidadPersonas: number;
  tipoEventoId: number;
  reservaId: number;
  tipoEvento?: TipoEvento;
  reserva?: Reserva;
}

export type EventoDto = Omit<Evento, 'id' | 'tipoEvento' | 'reserva'>;

export type EventoEdicionDto = Omit<EventoDto, 'reservaId'>;

export interface FiltrosEvento {
  reservaId?: number;
}
