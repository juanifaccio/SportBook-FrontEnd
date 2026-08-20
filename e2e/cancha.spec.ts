import { Page } from '@playwright/test';
import { ADMINISTRADOR, CANCHA_1, CANCHA_2, CANCHA_3, FUTBOL_5, PADEL } from './apoyo/datos';
import { abrirComo, dialogo, elegirOpcion, expect, notificacion, test } from './apoyo/fixtures';

/**
 * El listado de canchas con su filtro por tipo.
 *
 * El recorrido del ABM en sí —diálogo que se cierra cuando el backend confirma,
 * confirmación antes de borrar, estados de carga y error— ya lo cubre
 * `tipo-cancha.spec.ts`, que es la implementación de referencia. Lo que se
 * prueba acá es lo propio de este listado: que el filtro lo resuelva la API y
 * no la lista en memoria, y que alta y edición respeten el filtro puesto.
 */
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

    // Se espera el request para comprobar que el filtro viaja en la query: si
    // se filtrara la lista en memoria, la tabla quedaría igual y el test
    // pasaría sin que el backend se entere.
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

  // Una lista vacía por el filtro no es lo mismo que no tener ninguna cancha.
  test('avisa cuando ningún resultado coincide, sin decir que no hay canchas', async ({
    page,
    api
  }) => {
    api.estado.tiposCancha.push({ id: 9, nombre: 'Tenis', descripcion: 'Polvo de ladrillo' });

    await abrirComo(page, ADMINISTRADOR, '/canchas');
    await elegirOpcion(page, 'Tipo', 'Tenis');

    await expect(page.getByRole('heading', { name: 'Ninguna cancha es de Tenis' })).toBeVisible();
    await expect(page.getByText('Todavía no hay canchas')).toBeHidden();

    // Y el botón devuelve el listado completo.
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

    // Primera y no última: el listado viene ordenado por nombre, así que
    // dejarla al final la mostraría fuera de lugar hasta recargar.
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
    // El del formulario es "Tipo de cancha"; el filtro de la pantalla es "Tipo".
    await elegirOpcion(page, 'Tipo de cancha', FUTBOL_5.nombre);
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Cancha creada correctamente.');

    // Se guardó, pero no se muestra: la API tampoco la habría devuelto.
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

});
