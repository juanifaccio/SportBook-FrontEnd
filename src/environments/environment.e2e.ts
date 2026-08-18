/**
 * Ambiente de los tests end-to-end. Reemplaza a `environment.ts` cuando se
 * levanta el servidor con `ng serve --configuration e2e` (ver `angular.json`).
 *
 * La única diferencia con desarrollo es de dónde cuelga la API: acá es `/api`,
 * el mismo origen que sirve la aplicación, en vez de `localhost:3000`. Los tests
 * no levantan el backend —lo responden interceptando el tráfico del navegador—,
 * y con un solo origen no hay CORS ni preflights de por medio.
 */
export const environment = {
  production: false,
  apiUrl: '/api'
};
