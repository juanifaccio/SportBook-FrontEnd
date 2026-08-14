/** Rol tal como lo devuelve el backend. */
export interface Rol {
  id: number;
  nombre: string;
}

/**
 * Etiquetas legibles de los roles que siembra la migración del backend. El
 * catálogo es de solo lectura, pero se resuelve con una función y no indexando
 * el mapa para que un rol agregado a mano en la base se muestre con su nombre
 * crudo en vez de dejar la celda vacía.
 */
const ETIQUETAS_ROL: Record<string, string> = {
  ADMIN: 'Administrador',
  CLIENTE: 'Cliente'
};

export const etiquetaRol = (nombre: string): string => ETIQUETAS_ROL[nombre] ?? nombre;
