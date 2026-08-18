import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de los tests end-to-end.
 *
 * Los e2e levantan la aplicación de verdad —`ng serve`, el bundle real, el
 * router, los guards y los diálogos de Material— y la manejan desde un navegador
 * como lo haría una persona. Lo único que no es real es el backend: lo responde
 * `e2e/apoyo/api-falsa.ts` interceptando el tráfico del navegador.
 *
 * Es a propósito. Los dos proyectos son independientes y agnósticos entre sí
 * (requisito de la cátedra), así que los tests del frontend no pueden exigir el
 * repositorio del backend ni una base MySQL para correr: se clona, se instala y
 * andan. Lo que solo se ve al juntar las piezas ya está cubierto por los tests
 * de integración del backend, que le pegan por HTTP a la API entera.
 *
 * El servidor va en el 4300 y no en el 4200 para no chocar con el `npm start`
 * que uno suele tener abierto mientras desarrolla.
 */

const PUERTO = 4300;

export default defineConfig({
  testDir: './e2e',

  /** Cada archivo tiene su propia API falsa, así que no se pisan entre sí. */
  fullyParallel: true,

  /** En CI un `test.only` olvidado escondería el resto de la suite. */
  forbidOnly: !!process.env['CI'],

  retries: process.env['CI'] ? 2 : 0,

  workers: process.env['CI'] ? 1 : undefined,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${PUERTO}`,

    /** Para poder ver qué pasó en el navegador cuando algo falla. */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',

    /**
     * La aplicación fija `LOCALE_ID` en `es-AR`, así que los precios y las
     * fechas no dependen del navegador. El huso horario sí se hereda del
     * sistema, a propósito: los datos de prueba calculan "mañana" en Node y la
     * aplicación calcula "hoy" en el navegador; si se le impusiera uno distinto
     * al de la máquina, los dos días dejarían de coincidir.
     */
    locale: 'es-AR'
  },

  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }
    }
  ],

  webServer: {
    command: 'npm run start:e2e',
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000
  }
});
