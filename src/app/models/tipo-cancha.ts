export interface TipoCancha {
  id: number;
  nombre: string;
  descripcion: string;
}

export type TipoCanchaDto = Omit<TipoCancha, 'id'>;
