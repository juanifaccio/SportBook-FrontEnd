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
