import { ADMINISTRADOR, ANA } from './apoyo/datos';
import { abrirComo, expect, test } from './apoyo/fixtures';

/**
 * Navegación: el ruteo, los títulos de cada pantalla, la 404 y el menú lateral,
 * que es lo que cambia de forma entre pantalla chica y pantalla ancha.
 */
test.describe('Navegación', () => {

  test('la raíz lleva a reservar, que es el caso de uso central', async ({ page }) => {
    await abrirComo(page, ANA, '/');

    await expect(page).toHaveURL(/\/reservar$/);
    await expect(page.getByRole('heading', { name: 'Reservar una cancha' })).toBeVisible();
  });

  test('cada pantalla tiene su propio título', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservar');
    await expect(page).toHaveTitle('Reservar — SportBook');

    await page.getByRole('link', { name: 'Reservas' }).click();
    await expect(page).toHaveTitle('Reservas — SportBook');

    await page.getByRole('link', { name: 'Canchas' }).click();
    await expect(page).toHaveTitle('Canchas — SportBook');
  });

  test('una dirección que no existe muestra la 404, con el menú a mano', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/lo-que-sea');

    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
    await expect(page).toHaveTitle('Página no encontrada — SportBook');
    // La 404 cuelga del layout: el usuario no queda sin salida.
    await expect(page.locator('mat-sidenav')).toBeVisible();
  });

  test('desde MD el menú lateral está fijo y no hay botón para abrirlo', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservar');

    await expect(page.locator('mat-sidenav')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir menú de navegación' })).toHaveCount(0);
  });

  test.describe('en pantalla chica', () => {

    test.use({ viewport: { width: 390, height: 844 } });

    test('el menú arranca cerrado, se abre con el botón y se cierra al navegar', async ({
      page
    }) => {
      await abrirComo(page, ADMINISTRADOR, '/reservar');

      const menu = page.locator('mat-sidenav');

      await expect(menu).toBeHidden();

      await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
      await expect(menu).toBeVisible();

      await menu.getByRole('link', { name: 'Reservas' }).click();

      // Se cierra solo: en pantalla chica taparía el contenido al que se acaba
      // de entrar.
      await expect(menu).toBeHidden();
      await expect(page.getByRole('heading', { name: 'Reservas' })).toBeVisible();
    });

  });

});
