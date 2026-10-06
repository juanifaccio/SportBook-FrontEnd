/** Equipamiento tal como lo devuelve el backend. */
export interface Equipamiento {
  id: number;
  nombre: string;
  descripcion: string;
  /**
   * El backend lo guarda como `Decimal` y lo devuelve ya convertido a número,
   * para poder formatearlo y multiplicarlo por la cantidad alquilada.
   */
  precio: number;
  /** Unidades que tiene el complejo. Cero es válido: agotado, pero en catálogo. */
  stock: number;
  /**
   * Unidades libres durante un turno: el stock menos lo que alquilan las
   * reservas que se superponen con él. Solo viene cuando el listado se pide para
   * un turno; reservar no descuenta el stock.
   */
  disponibles?: number;
}

/**
 * Datos que se envían al crear o actualizar. El `id` lo asigna el backend, así
 * que no forma parte del cuerpo del request.
 */
export type EquipamientoDto = Omit<Equipamiento, 'id' | 'disponibles'>;
