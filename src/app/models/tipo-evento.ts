/** Tipo de evento tal como lo devuelve el backend. */
export interface TipoEvento {
  id: number;
  nombre: string;
}

/**
 * Datos que se envían al crear o actualizar. El `id` lo asigna el backend, así
 * que no forma parte del cuerpo del request.
 */
export type TipoEventoDto = Omit<TipoEvento, 'id'>;
