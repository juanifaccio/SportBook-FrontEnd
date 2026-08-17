import { Usuario } from '../../models/usuario';
import { ROLES } from '../../models/rol';
import { CLAVE_TOKEN, CLAVE_USUARIO } from '../services/auth.service';

/**
 * Ayudas para los tests que necesitan una sesión iniciada.
 *
 * `AuthService` lee la sesión guardada en el navegador al construirse, así que
 * dejarla armada en `localStorage` antes de configurar el `TestBed` es lo que
 * hace que el componente bajo prueba se comporte como con ese usuario conectado.
 *
 * El token es un texto cualquiera: en los tests el backend está mockeado y nadie
 * lo valida. Lo que importa es que esté, porque es lo que distingue "hay sesión"
 * de "no hay".
 */
export const TOKEN_DE_PRUEBA = 'token-de-prueba';

export const USUARIO_ADMIN: Usuario = {
  id: 1,
  nombre: 'Administrador',
  email: 'admin@sportbook.com',
  telefono: '341 555-0000',
  activo: true,
  rolId: 1,
  rol: { id: 1, nombre: ROLES.ADMIN }
};

export const USUARIO_CLIENTE: Usuario = {
  id: 6,
  nombre: 'Lucía Gómez',
  email: 'lucia.gomez@ejemplo.com',
  telefono: '341 555-9876',
  activo: true,
  rolId: 2,
  rol: { id: 2, nombre: ROLES.CLIENTE }
};

/** Deja una sesión armada, como si el usuario ya hubiera iniciado sesión. */
export const iniciarSesionDePrueba = (usuario: Usuario = USUARIO_ADMIN): void => {
  localStorage.setItem(CLAVE_TOKEN, TOKEN_DE_PRUEBA);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
};

/**
 * Borra la sesión. Va en el `afterEach` de cada suite que la use: `localStorage`
 * sobrevive entre tests, y una sesión olvidada haría pasar —o fallar— al
 * siguiente por un motivo que no tiene nada que ver con lo que prueba.
 */
export const cerrarSesionDePrueba = (): void => {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
};
