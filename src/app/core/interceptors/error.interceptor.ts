import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificacionService } from '../services/notificacion.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificacion = inject(NotificacionService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      notificacion.error(obtenerMensaje(error));
      return throwError(() => error);
    })
  );
};

function obtenerMensaje(error: HttpErrorResponse): string {
  if (typeof error.error?.mensaje === 'string') {
    return error.error.mensaje;
  }

  switch (error.status) {
    case 0:
      return 'No se pudo conectar con el servidor. Verificá que el backend esté ejecutándose.';
    case 400:
      return 'Los datos enviados no son válidos.';
    case 401:
      return 'Necesitás iniciar sesión para realizar esta acción.';
    case 403:
      return 'No tenés permisos para realizar esta acción.';
    case 404:
      return 'No se encontró el recurso solicitado.';
    case 500:
      return 'Ocurrió un error en el servidor. Intentá nuevamente en unos minutos.';
    default:
      return 'Ocurrió un error inesperado. Intentá nuevamente.';
  }
}
