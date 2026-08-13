/** Tipo de cancha tal como lo devuelve el backend. */
export interface TipoCancha {
  id: number;
  nombre: string;
  descripcion: string;
}

/**
 * Datos que se envían al crear o actualizar. El `id` lo asigna el backend, así
 * que no forma parte del cuerpo del request.
 */
export type TipoCanchaDto = Omit<TipoCancha, 'id'>;
