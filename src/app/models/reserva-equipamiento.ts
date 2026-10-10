import { Equipamiento } from './equipamiento';

export interface ReservaEquipamiento {
  id: number;
  cantidad: number;
  subtotal: number;
  reservaId: number;
  equipamientoId: number;
  equipamiento?: Equipamiento;
}

export interface EquipamientoPedido {
  equipamientoId: number;
  cantidad: number;
}
