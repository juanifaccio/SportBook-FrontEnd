import { Rol } from './rol';

/**
 * Usuario tal como lo devuelve el backend.
 *
 * La contraseña no está: la API nunca la devuelve, ni siquiera hasheada, así que
 * el frontend no la tiene nunca en memoria.
 */
export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
  rolId: number;
  /** El backend incluye el rol en el listado, para no pedirlo usuario por usuario. */
  rol?: Rol;
}

/**
 * Datos que se envían al crear o actualizar. La contraseña es opcional porque en
 * la edición el formulario la deja vacía para conservar la que ya estaba: no
 * puede reenviarla, dado que nunca la recibió.
 */
export type UsuarioDto = Omit<Usuario, 'id' | 'rol'> & {
  contrasena?: string;
};

/**
 * Datos que un usuario puede cambiarse a sí mismo desde su perfil.
 *
 * No es un `UsuarioDto` con menos campos: `rolId` y `activo` no están **a
 * propósito**, y el backend los descarta aunque viajen. Un cliente no se asciende
 * a administrador ni se reactiva una cuenta dada de baja editando su perfil.
 */
export type PerfilDto = Pick<Usuario, 'nombre' | 'email' | 'telefono'>;

/**
 * Cambio de contraseña propio. Pide la actual porque, si no, alcanzaría con un
 * token prestado para cambiarle la clave al dueño y dejarlo afuera de su cuenta.
 */
export interface CambioContrasenaDto {
  contrasenaActual: string;
  contrasenaNueva: string;
}
