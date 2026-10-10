export interface TipoEvento {
  id: number;
  nombre: string;
}

export type TipoEventoDto = Omit<TipoEvento, 'id'>;
