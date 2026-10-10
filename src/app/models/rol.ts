export interface Rol {
  id: number;
  nombre: string;
}

export const ROLES = {
  ADMIN: 'ADMIN',
  CLIENTE: 'CLIENTE'
} as const;

const ETIQUETAS_ROL: Record<string, string> = {
  ADMIN: 'Administrador',
  CLIENTE: 'Cliente'
};

export const etiquetaRol = (nombre: string): string => ETIQUETAS_ROL[nombre] ?? nombre;
