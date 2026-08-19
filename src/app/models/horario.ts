import { Cancha } from './cancha';

/** Turno de una cancha, tal como lo devuelve el backend. */
export interface Horario {
  id: number;
  /** Día del turno en formato `AAAA-MM-DD`, sin hora ni huso horario. */
  fecha: string;
  /** Hora de inicio en formato `HH:mm`. */
  horaInicio: string;
  /** Hora de fin en formato `HH:mm`. */
  horaFin: string;
  /** Un turno nace libre y se marca ocupado cuando alguien lo reserva. */
  disponible: boolean;
  canchaId: number;
  /** El backend incluye la cancha en el listado, para no pedirla turno por turno. */
  cancha?: Cancha;
}

/**
 * Datos que se envían al crear o actualizar. El `id` lo asigna el backend y la
 * cancha se manda como `canchaId`, así que el objeto anidado no forma parte del
 * cuerpo del request.
 */
export type HorarioDto = Omit<Horario, 'id' | 'cancha'>;

/**
 * Datos que se envían para generar de una vez todos los turnos de un día.
 *
 * No es un `HorarioDto`: no describe un turno sino el rango del que salen
 * varios, y el `disponible` no viaja porque un turno recién generado siempre
 * nace libre.
 */
export interface LoteHorarioDto {
  /** Día de los turnos, en formato `AAAA-MM-DD`. */
  fecha: string;
  /** Hora en que abre la cancha ese día, en formato `HH:mm`. */
  horaInicio: string;
  /** Hora en que cierra, en formato `HH:mm`. */
  horaFin: string;
  canchaId: number;
  /** Cuánto dura cada turno generado, en minutos. */
  duracion: number;
}

/** Lo que devuelve la generación en lote. */
export interface ResultadoLote {
  creados: Horario[];
  /**
   * Cuántos turnos del rango se saltearon por pisarse con alguno ya cargado.
   * Viene como número y no como lista: cuáles son ya se ven en el listado.
   */
  omitidos: number;
}

/**
 * Duraciones que ofrece el selector, en minutos. Son las que se usan en un
 * complejo; el backend acepta cualquiera entre 15 y 480, así que esta lista se
 * puede ampliar sin tocarlo.
 */
export const DURACIONES_TURNO = [30, 60, 90, 120];

/** Cómo se lee una duración en minutos: 90 es "1 hora y 30 minutos". */
export const etiquetaDuracion = (minutos: number): string => {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  const partes: string[] = [];

  if (horas > 0) {
    partes.push(horas === 1 ? '1 hora' : `${horas} horas`);
  }

  if (resto > 0) {
    partes.push(`${resto} minutos`);
  }

  return partes.join(' y ');
};
