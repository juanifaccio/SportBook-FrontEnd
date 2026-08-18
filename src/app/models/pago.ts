import { Reserva } from './reserva';

/** Métodos que acepta el enum `MetodoPago` del backend. */
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

/** Etiquetas legibles de cada método, para mostrarlas en la interfaz. */
export const ETIQUETAS_METODO_PAGO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia'
};

export const METODOS_PAGO: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];

/** Estados que acepta el enum `EstadoPago` del backend. */
export type EstadoPago = 'REGISTRADO' | 'ANULADO';

export const ETIQUETAS_ESTADO_PAGO: Record<EstadoPago, string> = {
  REGISTRADO: 'Registrado',
  ANULADO: 'Anulado'
};

/** Pago tal como lo devuelve el backend. */
export interface Pago {
  id: number;
  monto: number;
  /** Día en que se cobró, en formato `AAAA-MM-DD`. Lo pone el backend. */
  fecha: string;
  metodo: MetodoPago;
  estado: EstadoPago;
  reservaId: number;
  /** El backend la incluye, para no pedirla pago por pago. */
  reserva?: Reserva;
}

/**
 * Datos que se envían al registrar un cobro.
 *
 * No es un `Omit<Pago, 'id'>`: la fecha y el estado los pone el servidor —un pago
 * se registra el día en que se cobra y nace REGISTRADO—, así que ni siquiera
 * viajan.
 */
export interface PagoDto {
  reservaId: number;
  monto: number;
  metodo: MetodoPago;
}

/**
 * Datos que se envían al corregir un pago. Lo único editable es el método: el
 * monto no se edita —para eso se anula y se registra el correcto— y la reserva
 * tampoco, porque un pago no se muda.
 */
export interface PagoEdicionDto {
  metodo: MetodoPago;
}

/** Filtros opcionales del listado de pagos. */
export interface FiltrosPago {
  reservaId?: number;
  estado?: EstadoPago;
}

/**
 * Lo que falta pagar de una reserva: su precio total menos los pagos que no están
 * anulados.
 *
 * Es la misma regla que aplica el backend, repetida acá para poder mostrar el
 * saldo y acotar el monto del formulario sin pedir nada. Quien decide sigue
 * siendo el backend: lo que se calcula en el navegador es solo lo que se muestra.
 */
export const saldoDe = (reserva: Reserva): number => {
  const pagado = (reserva.pagos ?? [])
    .filter((pago) => pago.estado !== 'ANULADO')
    .reduce((total, pago) => total + pago.monto, 0);

  return reserva.precioTotal - pagado;
};
