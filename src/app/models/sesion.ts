import { Usuario } from './usuario';

export interface Credenciales {
  email: string;
  contrasena: string;
}

export interface RespuestaLogin {
  token: string;
  usuario: Usuario;
}
