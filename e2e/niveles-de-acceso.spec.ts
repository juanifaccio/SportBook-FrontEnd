import { ADMINISTRADOR, ANA } from './apoyo/datos';
import { abrirComo, expect, notificacion, test } from './apoyo/fixtures';

/**
 * Niveles de acceso: qué le ofrece la aplicación a cada rol y qué pasa cuando
 * alguien escribe a mano la URL de una pantalla que no le corresponde.
 *
 * Esconder lo que un rol no puede usar es para no hacerle perder el tiempo, no
 * para protegerlo. Lo que se comprueba acá es lo primero; que el backend rechace
 * igual la llamada es asunto de sus tests de integración.
 */

/** Las pantallas de administración del complejo, con su encabezado. */
const PANTALLAS_DE_ADMIN = [
  { ruta: '/canchas', titulo: 'Canchas' },
  { ruta: '/horarios', titulo: 'Horarios' },
  { ruta: '/usuarios', titulo: 'Usuarios' },
  { ruta: '/tipos-cancha', titulo: 'Tipos de cancha' },
  { ruta: '/tipos-evento', titulo: 'Tipos de evento' }
];

test.describe('Niveles de acceso', () => {

  test('el administrador tiene en el menú las nueve pantallas', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservar');

    // Se miran las etiquetas y no el nombre accesible del enlace: ese incluye
    // la ligadura del ícono de Material ("event_availableReservar").
    const items = page.locator('mat-sidenav [matListItemTitle]');

    await expect(items).toHaveText([
      'Reservar',
      'Reservas',
      'Eventos',
      'Pagos',
      'Canchas',
      'Horarios',
      'Usuarios',
      'Tipos de cancha',
      'Tipos de evento'
    ]);
  });

  // Eventos y Pagos entran en la lista del cliente: el evento es de quien es la
  // reserva, y de los pagos ve los de las suyas aunque no pueda registrarlos.
  // Tipos de evento, en cambio, es el catálogo que administra el complejo.
  test('el cliente solo ve en el menú lo que puede usar', async ({ page }) => {
    await abrirComo(page, ANA, '/reservar');

    const items = page.locator('mat-sidenav [matListItemTitle]');

    await expect(items).toHaveText(['Reservar', 'Reservas', 'Eventos', 'Pagos']);
  });

  test('el menú de la cuenta muestra quién está conectado y con qué rol', async ({ page }) => {
    await abrirComo(page, ANA, '/reservar');

    await page.getByRole('button', { name: 'Menú de la cuenta' }).click();

    const datos = page.locator('.datos-cuenta');

    await expect(datos).toContainText(ANA.nombre);
    await expect(datos).toContainText(ANA.email);
    await expect(datos).toContainText('Cliente');
  });

  for (const pantalla of PANTALLAS_DE_ADMIN) {
    test(`el administrador entra a ${pantalla.ruta}`, async ({ page }) => {
      await abrirComo(page, ADMINISTRADOR, pantalla.ruta);

      await expect(page).toHaveURL(new RegExp(`${pantalla.ruta}$`));
      await expect(page.getByRole('heading', { name: pantalla.titulo })).toBeVisible();
    });

    test(`al cliente que escribe ${pantalla.ruta} a mano se le explica por qué no`, async ({
      page
    }) => {
      await abrirComo(page, ANA, pantalla.ruta);

      await expect(notificacion(page)).toContainText(
        'No tenés permisos para entrar a esa pantalla.'
      );
      // No se lo deja en una pantalla vacía: se lo lleva a lo que sí puede hacer.
      await expect(page).toHaveURL(/\/reservar$/);
    });
  }

  test('las dos pantallas compartidas las abren los dos roles', async ({ page }) => {
    await abrirComo(page, ANA, '/reservas');

    await expect(page.getByRole('heading', { name: 'Reservas' })).toBeVisible();

    await page.getByRole('link', { name: 'Reservar' }).click();

    await expect(page.getByRole('heading', { name: 'Reservar una cancha' })).toBeVisible();
  });

});
