import { Cancha } from './cancha';

export interface Horario {
  id: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  disponible: boolean;
  canchaId: number;
  cancha?: Cancha;
}

export type HorarioDto = Omit<Horario, 'id' | 'cancha'>;

export interface LoteHorarioDto {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  canchaId: number;
  duracion: number;
}

export interface ResultadoLote {
  creados: Horario[];
  omitidos: number;
}

export const DURACIONES_TURNO = [30, 60, 90, 120];

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
