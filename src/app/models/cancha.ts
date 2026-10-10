import { TipoCancha } from './tipo-cancha';

export type EstadoCancha = 'DISPONIBLE' | 'MANTENIMIENTO';

export const ETIQUETAS_ESTADO: Record<EstadoCancha, string> = {
  DISPONIBLE: 'Disponible',
  MANTENIMIENTO: 'En mantenimiento'
};

export const ESTADOS_CANCHA: EstadoCancha[] = ['DISPONIBLE', 'MANTENIMIENTO'];

export interface Cancha {
  id: number;
  nombre: string;
  precioPorHora: number;
  estado: EstadoCancha;
  tipoCanchaId: number;
  tipoCancha?: TipoCancha;
}

export type CanchaDto = Omit<Cancha, 'id' | 'tipoCancha'>;

export interface FiltrosCancha {
  tipoCanchaId?: number;
}
