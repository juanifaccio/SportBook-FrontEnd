import { Page } from '@playwright/test';
import { ADMINISTRADOR, CANCHA_1, CANCHA_2, CANCHA_3, FUTBOL_5, PADEL } from './apoyo/datos';
import { abrirComo, dialogo, elegirOpcion, expect, notificacion, test } from './apoyo/fixtures';

test.describe('Listado de canchas con filtro por tipo', () => {

  const filas = (page: Page) => page.locator('table tbody tr');

  test('lista todas las canchas ordenadas por nombre', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/canchas');

    await expect(filas(page)).toHaveCount(3);
    await expect(filas(page).first()).toContainText(CANCHA_1.nombre);
    await expect(filas(page).first()).toContainText(FUTBOL_5.nombre);
    await expect(filas(page).nth(2)).toContainText(CANCHA_3.nombre);
  });

  test('filtra por tipo pidiéndoselo a la API', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/canchas');

    const pedido = page.waitForRequest(
      (peticion) => peticion.url().includes('/canchas?tipoCanchaId=' + PADEL.id)
    );

    await elegirOpcion(page, 'Tipo', PADEL.nombre);
    await pedido;

    await expect(filas(page)).toHaveCount(2);
    await expect(page.locator('table')).toContainText(CANCHA_2.nombre);
    await expect(page.locator('table')).not.toContainText(CANCHA_1.nombre);
  });

  test('vuelve a mostrarlas todas al quitar el filtro', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/canchas');

    await elegirOpcion(page, 'Tipo', PADEL.nombre);
    await expect(filas(page)).toHaveCount(2);

    await elegirOpcion(page, 'Tipo', 'Todos');

    await expect(filas(page)).toHaveCount(3);
  });

  test('avisa cuando ningún resultado coincide, sin decir que no hay canchas', async ({
    page,
    api
  }) => {
    api.estado.tiposCancha.push({ id: 9, nombre: 'Tenis', descripcion: 'Polvo de ladrillo' });

    await abrirComo(page, ADMINISTRADOR, '/canchas');
    await elegirOpcion(page, 'Tipo', 'Tenis');

    await expect(page.getByRole('heading', { name: 'Ninguna cancha es de Tenis' })).toBeVisible();
    await expect(page.getByText('Todavía no hay canchas')).toBeHidden();

    await page.getByRole('button', { name: 'Ver todas' }).click();
    await expect(filas(page)).toHaveCount(3);
  });

  test('la cancha recién creada aparece en su lugar por nombre', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/canchas');

    await page.getByRole('button', { name: 'Nueva cancha' }).click();

    const formulario = dialogo(page);

    await formulario.getByLabel('Nombre').fill('Cancha 0');
    await formulario.getByLabel('Precio por hora').fill('7000');
    await elegirOpcion(page, 'Tipo de cancha', FUTBOL_5.nombre);
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Cancha creada correctamente.');

    await expect(filas(page)).toHaveCount(4);
    await expect(filas(page).first()).toContainText('Cancha 0');

    expect(api.estado.canchas.map((cancha) => cancha.nombre)).toContain('Cancha 0');
  });

  test('la cancha nueva de otro tipo no se cuela en el listado filtrado', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/canchas');

    await elegirOpcion(page, 'Tipo', PADEL.nombre);
    await expect(filas(page)).toHaveCount(2);

    await page.getByRole('button', { name: 'Nueva cancha' }).click();

    const formulario = dialogo(page);

    await formulario.getByLabel('Nombre').fill('Cancha 4');
    await formulario.getByLabel('Precio por hora').fill('7000');
    await elegirOpcion(page, 'Tipo de cancha', FUTBOL_5.nombre);
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Cancha creada correctamente.');

    await expect(filas(page)).toHaveCount(2);
    await expect(page.locator('table')).not.toContainText('Cancha 4');
  });

  test('la cancha a la que se le cambia el tipo sale del listado filtrado', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/canchas');

    await elegirOpcion(page, 'Tipo', PADEL.nombre);
    await expect(filas(page)).toHaveCount(2);

    await page.getByRole('button', { name: `Editar ${CANCHA_2.nombre}` }).click();

    const formulario = dialogo(page);

    await elegirOpcion(page, 'Tipo de cancha', FUTBOL_5.nombre);
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Cancha actualizada correctamente.');

    await expect(filas(page)).toHaveCount(1);
    await expect(page.locator('table')).not.toContainText(CANCHA_2.nombre);
  });

  test('no borra una cancha que tiene turnos, y lo dice', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/canchas');

    await page.getByRole('button', { name: `Eliminar ${CANCHA_1.nombre}` }).click();
    await dialogo(page).getByRole('button', { name: 'Eliminar' }).click();

    await expect(notificacion(page)).toContainText('tiene horarios asociados');
    await expect(page.getByRole('button', { name: `Eliminar ${CANCHA_1.nombre}` })).toBeVisible();
    expect(api.estado.canchas.some((cancha) => cancha.id === CANCHA_1.id)).toBe(true);
  });
});
