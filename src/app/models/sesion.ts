import { Usuario } from './usuario';

/** Lo que se manda al iniciar sesión. */
export interface Credenciales {
  email: string;
  contrasena: string;
}

/**
 * Lo que devuelve `POST /api/auth/login`.
 *
 * El usuario viene junto con el token para no tener que pedir el perfil en una
 * segunda llamada: con él ya se sabe qué nombre mostrar y qué pantallas ofrecer.
 */
export interface RespuestaLogin {
  token: string;
  usuario: Usuario;
}
