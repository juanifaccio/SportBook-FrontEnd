import { Rol } from './rol';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
  rolId: number;
  rol?: Rol;
}

export type UsuarioDto = Omit<Usuario, 'id' | 'rol'> & {
  contrasena?: string;
};

export type PerfilDto = Pick<Usuario, 'nombre' | 'email' | 'telefono'>;

export interface CambioContrasenaDto {
  contrasenaActual: string;
  contrasenaNueva: string;
}
