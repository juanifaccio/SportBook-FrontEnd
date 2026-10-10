import { Page } from '@playwright/test';
import { ADMINISTRADOR, CANCHA_1, CANCHA_3, MANANA } from './apoyo/datos';
import {
  abrirComo,
  dialogo,
  elegirOpcion,
  escribirFecha,
  expect,
  notificacion,
  test
} from './apoyo/fixtures';

test.describe('horarios de una cancha', () => {
  const botonGenerar = (page: Page) =>
    page.getByRole('button', { name: 'Generar turnos' }).first();

  const generar = async (
    formulario: ReturnType<typeof dialogo>,
    desde: string,
    hasta: string,
    duracion?: string
  ) => {
    await escribirFecha(formulario, 'Fecha', MANANA);
    await formulario.getByLabel('Abre a las').fill(desde);
    await formulario.getByLabel('Cierra a las').fill(hasta);

    if (duracion) {
      await formulario.getByRole('combobox', { name: 'Duración de cada turno' }).click();
      await formulario.page().getByRole('option', { name: duracion, exact: true }).click();
    }
  };

  const elegirCanchaDelDialogo = async (
    formulario: ReturnType<typeof dialogo>,
    nombre: string
  ) => {
    await formulario.getByRole('combobox', { name: 'Cancha' }).click();
    await formulario.page().getByRole('option', { name: new RegExp(nombre) }).click();
  };

  test('lista los turnos de la cancha elegida', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    await expect(page.locator('table tbody tr')).toHaveCount(4);
    await expect(page.locator('table')).toContainText('10:00');
  });

  test('genera todos los turnos de un día de una sola vez', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    await elegirOpcion(page, 'Cancha', /Cancha 3/);
    await expect(page.getByRole('heading', { name: /todavía no tiene horarios/ })).toBeVisible();

    await botonGenerar(page).click();

    const formulario = dialogo(page);

    await expect(formulario.getByRole('heading', { name: 'Generar turnos' })).toBeVisible();

    await generar(formulario, '08:00', '12:00');

    await expect(formulario).toContainText('Se van a generar 4 turnos');

    await formulario.getByRole('button', { name: 'Generar' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Se generaron 4 turnos.');

    await expect(page.locator('table tbody tr')).toHaveCount(4);
    await expect(page.locator('table')).toContainText('08:00');
    await expect(page.locator('table')).toContainText('11:00');

    const generados = api.estado.horarios.filter(
      (horario) => horario.canchaId === CANCHA_3.id && horario.fecha === MANANA
    );

    expect(generados.map((horario) => horario.horaInicio)).toEqual([
      '08:00',
      '09:00',
      '10:00',
      '11:00'
    ]);
    expect(generados.every((horario) => horario.disponible)).toBe(true);
  });

  test('sigue al lote cuando se genera para otra cancha', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    await expect(page.locator('table tbody tr')).toHaveCount(4);

    await botonGenerar(page).click();

    const formulario = dialogo(page);

    await elegirCanchaDelDialogo(formulario, CANCHA_3.nombre);
    await generar(formulario, '08:00', '10:00');
    await formulario.getByRole('button', { name: 'Generar' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Se generaron 2 turnos.');

    await expect(page.getByRole('combobox', { name: 'Cancha' })).toContainText(CANCHA_3.nombre);
    await expect(page.locator('table tbody tr')).toHaveCount(2);
    await expect(page.locator('table')).toContainText('08:00');
  });

  test('sigue al turno cargado en otra cancha', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    await page.getByRole('button', { name: 'Nuevo horario' }).click();

    const formulario = dialogo(page);

    await elegirCanchaDelDialogo(formulario, CANCHA_3.nombre);
    await escribirFecha(formulario, 'Fecha', MANANA);
    await formulario.getByLabel('Desde').fill('16:00');
    await formulario.getByLabel('Hasta').fill('17:00');
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Horario creado correctamente.');

    await expect(page.getByRole('combobox', { name: 'Cancha' })).toContainText(CANCHA_3.nombre);
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table')).toContainText('16:00');
  });

  test('saltea los turnos que ya estaban y avisa cuántos', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    const antes = api.estado.horarios.length;

    await botonGenerar(page).click();

    const formulario = dialogo(page);

    await generar(formulario, '08:00', '13:00');
    await formulario.getByRole('button', { name: 'Generar' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText(
      'Se generaron 3 turnos. Otros 2 ya estaban cargados.'
    );

    expect(api.estado.horarios.length).toBe(antes + 3);
  });

  test('no vuelve a generar un día que ya está completo', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    const antes = api.estado.horarios.length;

    await botonGenerar(page).click();

    const formulario = dialogo(page);

    await generar(formulario, '10:00', '12:00');
    await formulario.getByRole('button', { name: 'Generar' }).click();

    await expect(notificacion(page)).toContainText(
      'Todos los turnos de ese rango ya estaban cargados'
    );
    await expect(formulario).toBeVisible();
    expect(api.estado.horarios.length).toBe(antes);
  });

  test('avisa cuando no entra ningún turno de esa duración', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    const antes = api.estado.horarios.length;

    await botonGenerar(page).click();

    const formulario = dialogo(page);

    await generar(formulario, '10:00', '11:00', '2 horas');
    await formulario.getByRole('button', { name: 'Generar' }).click();

    await expect(
      formulario.getByText('No entra ningún turno de esa duración en ese horario.')
    ).toBeVisible();
    expect(api.estado.horarios.length).toBe(antes);
  });

  test('el turno generado queda disponible para reservar', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    await botonGenerar(page).click();

    const formulario = dialogo(page);

    await generar(formulario, '14:00', '15:00');
    await formulario.getByRole('button', { name: 'Generar' }).click();
    await expect(formulario).toBeHidden();

    await page.goto('/reservar');
    await expect(page.getByText(`No quedan turnos libres en ${CANCHA_1.nombre}`)).toBeVisible();
    await escribirFecha(page, 'Día', MANANA);

    const turnos = page.getByRole('listbox', { name: 'Turnos libres' }).getByRole('option');

    await expect(turnos).toContainText(['14:00 a 15:00']);
  });

  test('no deja volver a ofrecer un turno reservado', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    await page.getByRole('button', { name: 'Editar el turno de las 18:00' }).click();

    const formulario = dialogo(page);

    await formulario.getByRole('checkbox', { name: 'Disponible para reservar' }).check();
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(notificacion(page)).toContainText('no se puede volver a ofrecer');
    await expect(formulario).toBeVisible();
    expect(api.estado.horarios.find((horario) => horario.id === 3)?.disponible).toBe(false);
  });

  test('no deja eliminar un turno reservado', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    await page.getByRole('button', { name: 'Eliminar el turno de las 18:00' }).click();
    await dialogo(page).getByRole('button', { name: 'Eliminar' }).click();

    await expect(notificacion(page)).toContainText('tiene reservas asociadas');
    await expect(page.locator('table tbody tr')).toHaveCount(4);
    expect(api.estado.horarios.some((horario) => horario.id === 3)).toBe(true);
  });

  test.describe('en pantalla chica', () => {

    test.use({ viewport: { width: 390, height: 844 } });

    test('los dos botones del encabezado entran en el ancho de la pantalla', async ({ page }) => {
      await abrirComo(page, ADMINISTRADOR, '/horarios');

      const generar = await botonGenerar(page).boundingBox();
      const alta = await page.getByRole('button', { name: 'Nuevo horario' }).boundingBox();

      expect(generar!.x).toBeGreaterThanOrEqual(0);
      expect(alta!.x + alta!.width).toBeLessThanOrEqual(390);
      expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(390);
    });

    test('el listado pasa de tabla a tarjetas', async ({ page }) => {
      await abrirComo(page, ADMINISTRADOR, '/horarios');

      await expect(page.locator('table')).toBeHidden();
      await expect(page.locator('.tarjetas mat-card')).toHaveCount(4);
    });

  });
});
