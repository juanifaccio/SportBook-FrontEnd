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
