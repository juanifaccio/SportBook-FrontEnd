import { Reserva } from './reserva';

export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

export const ETIQUETAS_METODO_PAGO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia'
};

export const METODOS_PAGO: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];

export type EstadoPago = 'REGISTRADO' | 'ANULADO';

export const ETIQUETAS_ESTADO_PAGO: Record<EstadoPago, string> = {
  REGISTRADO: 'Registrado',
  ANULADO: 'Anulado'
};

export interface Pago {
  id: number;
  monto: number;
  fecha: string;
  metodo: MetodoPago;
  estado: EstadoPago;
  reservaId: number;
  reserva?: Reserva;
}

export interface PagoDto {
  reservaId: number;
  monto: number;
  metodo: MetodoPago;
}

export interface PagoEdicionDto {
  metodo: MetodoPago;
}

export interface FiltrosPago {
  reservaId?: number;
  estado?: EstadoPago;
}

export const saldoDe = (reserva: Reserva): number => {
  const pagado = (reserva.pagos ?? [])
    .filter((pago) => pago.estado !== 'ANULADO')
    .reduce((total, pago) => total + pago.monto, 0);

  return reserva.precioTotal - pagado;
};
