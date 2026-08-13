/**
 * Ambiente de desarrollo (por defecto).
 *
 * Para apuntar a otro backend, cambiar `apiUrl` acá. En el build de producción
 * este archivo se reemplaza por `environment.production.ts` (ver `fileReplacements`
 * en `angular.json`).
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
