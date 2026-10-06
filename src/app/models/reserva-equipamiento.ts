import { Equipamiento } from './equipamiento';

/** Un artículo alquilado en una reserva, tal como lo devuelve el backend. */
export interface ReservaEquipamiento {
  id: number;
  cantidad: number;
  /**
   * Precio del artículo por la cantidad, calculado en el backend al reservar. Es
   * una copia: si el artículo cambia de precio después, la reserva no cambia.
   */
  subtotal: number;
  reservaId: number;
  equipamientoId: number;
  /** El backend incluye el artículo, para poder nombrarlo en el detalle. */
  equipamiento?: Equipamiento;
}

/**
 * Lo que se pide alquilar al reservar: qué artículo y cuántas unidades. El
 * subtotal no viaja, por lo mismo que el precio de la reserva: lo calcula el
 * backend.
 */
export interface EquipamientoPedido {
  equipamientoId: number;
  cantidad: number;
}
