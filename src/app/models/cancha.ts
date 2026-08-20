import { TipoCancha } from './tipo-cancha';

/** Estados que acepta el enum `EstadoCancha` del backend. */
export type EstadoCancha = 'DISPONIBLE' | 'MANTENIMIENTO';

/** Etiquetas legibles de cada estado, para mostrarlas en la interfaz. */
export const ETIQUETAS_ESTADO: Record<EstadoCancha, string> = {
  DISPONIBLE: 'Disponible',
  MANTENIMIENTO: 'En mantenimiento'
};

/** Estados en el orden en el que se ofrecen en el formulario. */
export const ESTADOS_CANCHA: EstadoCancha[] = ['DISPONIBLE', 'MANTENIMIENTO'];

/** Cancha tal como la devuelve el backend. */
export interface Cancha {
  id: number;
  nombre: string;
  precioPorHora: number;
  estado: EstadoCancha;
  tipoCanchaId: number;
  /** El backend incluye el tipo en el listado, para no pedirlo cancha por cancha. */
  tipoCancha?: TipoCancha;
}

/**
 * Datos que se envían al crear o actualizar. El `id` lo asigna el backend y el
 * tipo se manda como `tipoCanchaId`, así que el objeto anidado no forma parte
 * del cuerpo del request.
 */
export type CanchaDto = Omit<Cancha, 'id' | 'tipoCancha'>;

/**
 * Filtros del listado, tal como los espera el backend en la query. Se filtra
 * allá y no acá: traer todas las canchas del complejo para descartar la
 * mayoría en el navegador es trabajo que crece con cada cancha que se sume.
 */
export interface FiltrosCancha {
  tipoCanchaId?: number;
}
