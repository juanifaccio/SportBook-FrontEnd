export interface Equipamiento {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  disponibles?: number;
}

export type EquipamientoDto = Omit<Equipamiento, 'id' | 'disponibles'>;
