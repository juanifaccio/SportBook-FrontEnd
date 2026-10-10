import { Usuario } from '../../models/usuario';
import { ROLES } from '../../models/rol';
import { CLAVE_TOKEN, CLAVE_USUARIO } from '../services/auth.service';

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

export const iniciarSesionDePrueba = (usuario: Usuario = USUARIO_ADMIN): void => {
  localStorage.setItem(CLAVE_TOKEN, TOKEN_DE_PRUEBA);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
};

export const cerrarSesionDePrueba = (): void => {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
};
