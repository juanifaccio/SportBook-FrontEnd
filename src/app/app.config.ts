import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { PROVEEDORES_FECHA } from './core/fecha-adapter';

// Los precios y las fechas se muestran con el formato local: sin esto el
// `currency` de una cancha saldría como "ARS8,500.50" en vez de "$ 8.500,50".
registerLocaleData(localeEsAr);

// Angular Material 22 resuelve sus transiciones con CSS, así que no hace falta
// el paquete `@angular/animations` ni `provideAnimations*()`.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-AR' },
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor])),

    // El calendario de Material trabaja con objetos `Date`, y escribir la fecha
    // a mano tiene que ser siempre día/mes/año. Ver `core/fecha-adapter.ts`.
    PROVEEDORES_FECHA
  ]
};
