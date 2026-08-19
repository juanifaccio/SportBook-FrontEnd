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

/**
 * Pantalla de horarios: los turnos de una cancha.
 *
 * El foco está en la generación en lote, que es lo que no se ve en los tests de
 * Vitest: ahí el formulario y el diálogo se prueban por separado, y acá se
 * recorre entero el camino de llenar un día desde el listado.
 */
test.describe('horarios de una cancha', () => {

  /**
   * El botón que abre la generación. Con el estado vacío en pantalla hay dos
   * —el del encabezado y el de la tarjeta—, así que se toma el primero.
   */
  const botonGenerar = (page: Page) =>
    page.getByRole('button', { name: 'Generar turnos' }).first();

  /** Completa el diálogo de generación. La duración viene propuesta en 1 hora. */
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

  test('lista los turnos de la cancha elegida', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    // Los de la Cancha 1: dos de mañana libres, uno tomado y uno de ayer.
    await expect(page.locator('table tbody tr')).toHaveCount(4);
    await expect(page.locator('table')).toContainText('10:00');
  });

  test('genera todos los turnos de un día de una sola vez', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    // La Cancha 3 no tiene ningún turno, así que la pantalla muestra el estado
    // vacío, que es donde la generación va primero.
    await elegirOpcion(page, 'Cancha', /Cancha 3/);
    await expect(page.getByRole('heading', { name: /todavía no tiene horarios/ })).toBeVisible();

    await botonGenerar(page).click();

    const formulario = dialogo(page);

    await expect(formulario.getByRole('heading', { name: 'Generar turnos' })).toBeVisible();

    await generar(formulario, '08:00', '12:00');

    // El formulario adelanta cuántos van a salir antes de mandar nada.
    await expect(formulario).toContainText('Se van a generar 4 turnos');

    await formulario.getByRole('button', { name: 'Generar' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Se generaron 4 turnos.');

    // Cuatro turnos consecutivos de una hora, y guardados del otro lado.
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
    // Un turno recién generado nace libre, listo para reservarse.
    expect(generados.every((horario) => horario.disponible)).toBe(true);
  });

  test('saltea los turnos que ya estaban y avisa cuántos', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    const antes = api.estado.horarios.length;

    await botonGenerar(page).click();

    const formulario = dialogo(page);

    // La Cancha 1 ya tiene mañana de 10:00 a 11:00 y de 11:00 a 12:00: de los
    // cinco turnos del rango se crean tres.
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
    // El diálogo sigue abierto con lo cargado: cambiar el rango es justo lo que
    // hay que hacer para que el lote sirva de algo.
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
    // Ni siquiera se llamó a la API: el rango se descarta acá.
    expect(api.estado.horarios.length).toBe(antes);
  });

  // Es lo que junta esta pantalla con el caso de uso central: un turno generado
  // en lote no es distinto de uno cargado a mano, y se tiene que poder reservar.
  test('el turno generado queda disponible para reservar', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/horarios');

    await botonGenerar(page).click();

    const formulario = dialogo(page);

    // Una franja de la tarde, que la Cancha 1 todavía no tiene cargada.
    await generar(formulario, '14:00', '15:00');
    await formulario.getByRole('button', { name: 'Generar' }).click();
    await expect(formulario).toBeHidden();

    await page.goto('/reservar');
    await expect(page.getByText(`No quedan turnos libres en ${CANCHA_1.nombre}`)).toBeVisible();
    await escribirFecha(page, 'Día', MANANA);

    const turnos = page.getByRole('listbox', { name: 'Turnos libres' }).getByRole('option');

    await expect(turnos).toContainText(['14:00 a 15:00']);
  });

  test.describe('en pantalla chica', () => {

    test.use({ viewport: { width: 390, height: 844 } });

    // El encabezado pasó de un botón a dos: en el ancho más chico que se exige
    // entran igual en la misma fila, y lo que hay que comprobar es que ninguno
    // termine cortado fuera de la pantalla.
    test('los dos botones del encabezado entran en el ancho de la pantalla', async ({ page }) => {
      await abrirComo(page, ADMINISTRADOR, '/horarios');

      const generar = await botonGenerar(page).boundingBox();
      const alta = await page.getByRole('button', { name: 'Nuevo horario' }).boundingBox();

      expect(generar!.x).toBeGreaterThanOrEqual(0);
      expect(alta!.x + alta!.width).toBeLessThanOrEqual(390);
      // Y la página no se desborda: sin el `flex-wrap` los botones empujarían el
      // ancho del documento más allá del de la ventana.
      expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(390);
    });

    test('el listado pasa de tabla a tarjetas', async ({ page }) => {
      await abrirComo(page, ADMINISTRADOR, '/horarios');

      await expect(page.locator('table')).toBeHidden();
      await expect(page.locator('.tarjetas mat-card')).toHaveCount(4);
    });

  });
});
