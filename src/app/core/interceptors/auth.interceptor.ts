import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Adjunta el token de la sesión a cada request y cierra la sesión cuando el
 * backend responde que ya no sirve.
 *
 * Va acá y no en cada servicio porque es lo mismo para todos: un servicio que se
 * olvidara de mandarlo fallaría con un 401 imposible de explicar.
 *
 * El `401` es el único que desloguea. Un `403` significa que la sesión es válida
 * pero ese usuario no puede hacer eso —un cliente tocando una pantalla de
 * administración—, y echarlo por eso sería castigar un permiso que le falta como
 * si fuera una sesión vencida.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  const pedido = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(pedido).pipe(
    catchError((error: HttpErrorResponse) => {
      // El login también responde 401 cuando la contraseña es incorrecta, pero
      // ahí no hay ninguna sesión que cerrar ni a dónde redirigir: el usuario ya
      // está en la pantalla de login.
      if (error.status === 401 && !esLogin(req.url)) {
        auth.cerrarSesion();
      }

      return throwError(() => error);
    })
  );
};

const esLogin = (url: string): boolean => url.endsWith('/auth/login');
