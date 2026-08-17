import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../services/notificacion.service';

/**
 * Deja entrar solo con sesión iniciada. Si no la hay, manda al login y se
 * acuerda de a dónde quería ir el usuario para devolverlo ahí después.
 *
 * Es comodidad, no seguridad: quien edite la sesión guardada en el navegador
 * puede saltearlo, pero lo único que va a ver son pantallas vacías, porque cada
 * request se lo va a rechazar el backend. Ahí es donde se decide de verdad.
 */
export const sesionGuard: CanActivateFn = (ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { volverA: estado.url } });
};

/**
 * Restringe las pantallas de administración del complejo. Al cliente que llega a
 * una por la URL se le explica por qué no y se lo lleva a reservar, que es lo
 * que sí puede hacer.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notificacion = inject(NotificacionService);

  if (auth.esAdmin()) {
    return true;
  }

  notificacion.error('No tenés permisos para entrar a esa pantalla.');

  return router.createUrlTree(['/reservar']);
};

/**
 * Lo contrario del `sesionGuard`, para el login: quien ya inició sesión no tiene
 * nada que hacer ahí, así que se lo manda adentro.
 */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.autenticado() ? router.createUrlTree(['/reservar']) : true;
};
