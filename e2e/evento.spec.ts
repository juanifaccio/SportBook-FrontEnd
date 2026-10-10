import { ADMINISTRADOR, ANA, BRUNO, CUMPLEANIOS, TORNEO } from './apoyo/datos';
import {
  abrirComo,
  dialogo,
  elegirOpcion,
  expect,
  notificacion,
  test
} from './apoyo/fixtures';

test.describe('ABM de eventos', () => {

  test('lista el evento sembrado con la reserva a la que pertenece', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/eventos');

    const filas = page.locator('table tbody tr');

    await expect(filas).toHaveCount(1);
    await expect(filas.first()).toContainText('Cumpleaños de 15');
    await expect(filas.first()).toContainText(CUMPLEANIOS.nombre);
    await expect(filas.first()).toContainText('40');
    await expect(filas.first()).toContainText('18:00 a 19:00');
    await expect(filas.first()).toContainText('Cancha 1');
  });

  test('le carga un evento a una reserva que no tenía', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/eventos');

    await page.getByRole('button', { name: 'Nuevo evento' }).click();

    const formulario = dialogo(page);

    await expect(formulario.getByRole('heading', { name: 'Nuevo evento' })).toBeVisible();

    await elegirOpcion(page, 'Reserva', /20:00 a 21:00/);
    await elegirOpcion(page, 'Tipo de evento', TORNEO.nombre);
    await formulario.getByLabel('Descripción').fill('Torneo relámpago');
    await formulario.getByLabel('Cantidad de personas').fill('16');
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Evento creado correctamente.');
    await expect(page.locator('table tbody tr')).toHaveCount(2);

    const creado = api.estado.eventos.at(-1);
    expect(creado?.descripcion).toBe('Torneo relámpago');
    expect(creado?.reservaId).toBe(2);
  });

  test('no ofrece las reservas que ya tienen evento ni las canceladas', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/eventos');

    await page.getByRole('button', { name: 'Nuevo evento' }).click();
    await page.getByRole('combobox', { name: 'Reserva' }).click();

    const opciones = page.getByRole('option');

    await expect(opciones).toHaveCount(2);
    await expect(opciones.first()).not.toContainText('18:00 a 19:00');
  });

  test('no deja crear uno vacío', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/eventos');

    await page.getByRole('button', { name: 'Nuevo evento' }).click();
    await dialogo(page).getByRole('button', { name: 'Crear' }).click();

    await expect(page.getByText('La reserva es obligatoria.')).toBeVisible();
    await expect(page.getByText('El tipo de evento es obligatorio.')).toBeVisible();
    await expect(page.getByText('La descripción es obligatoria.')).toBeVisible();
    await expect(dialogo(page)).toBeVisible();
  });

  test('rechaza una cantidad de personas con decimales', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/eventos');

    await page.getByRole('button', { name: 'Nuevo evento' }).click();

    const formulario = dialogo(page);

    await formulario.getByLabel('Cantidad de personas').fill('12.5');
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(
      page.getByText('La cantidad de personas tiene que ser un número entero.')
    ).toBeVisible();
  });

  test('edita uno existente sin dejar cambiarle la reserva', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/eventos');

    await page.getByRole('button', { name: 'Editar Cumpleaños de 15' }).click();

    const formulario = dialogo(page);

    await expect(formulario.getByRole('heading', { name: 'Editar evento' })).toBeVisible();
    await expect(formulario.getByRole('combobox', { name: 'Reserva' })).toHaveCount(0);
    await expect(formulario).toContainText('18:00 a 19:00');

    await formulario.getByLabel('Cantidad de personas').fill('55');
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Evento actualizado correctamente.');
    expect(api.estado.eventos[0].cantidadPersonas).toBe(55);
    expect(api.estado.eventos[0].reservaId).toBe(1);
  });

  test('elimina uno después de confirmar y libera su reserva', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/eventos');

    await page.getByRole('button', { name: 'Eliminar Cumpleaños de 15' }).click();

    const confirmacion = dialogo(page);

    await expect(confirmacion.getByRole('heading', { name: 'Eliminar evento' })).toBeVisible();
    await confirmacion.getByRole('button', { name: 'Eliminar' }).click();

    await expect(notificacion(page)).toContainText('Evento eliminado correctamente.');
    await expect(page.getByText('Todavía no hay eventos')).toBeVisible();
    expect(api.estado.eventos).toHaveLength(0);

    await page.getByRole('button', { name: 'Nuevo evento' }).first().click();
    await page.getByRole('combobox', { name: 'Reserva' }).click();
    await expect(page.getByRole('option')).toHaveCount(3);
  });

  test('si el servidor no responde, avisa y el evento sigue en la lista', async ({ page, api }) => {
    api.fallar('DELETE', '/eventos/1', 0);

    await abrirComo(page, ADMINISTRADOR, '/eventos');

    await page.getByRole('button', { name: 'Eliminar Cumpleaños de 15' }).click();
    await dialogo(page).getByRole('button', { name: 'Eliminar' }).click();

    await expect(notificacion(page)).toContainText('No se pudo conectar con el servidor');
    await expect(page.getByRole('button', { name: 'Eliminar Cumpleaños de 15' })).toBeVisible();
    expect(api.estado.eventos).toHaveLength(1);
  });

  test('al cliente le muestra solamente los eventos de sus reservas', async ({ page }) => {
    await abrirComo(page, ANA, '/eventos');

    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table')).toContainText('Cumpleaños de 15');
    await expect(page.locator('table')).not.toContainText('A nombre de');
  });

  test('otro cliente no ve el evento ajeno', async ({ page }) => {
    await abrirComo(page, BRUNO, '/eventos');

    await expect(page.getByText('Todavía no hay eventos')).toBeVisible();
  });

  test('no se puede eliminar un tipo de evento que está en uso', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/tipos-evento');

    await page.getByRole('button', { name: `Eliminar ${CUMPLEANIOS.nombre}` }).click();
    await dialogo(page).getByRole('button', { name: 'Eliminar' }).click();

    await expect(notificacion(page)).toContainText('tiene eventos asociados');
    await expect(page.locator('table')).toContainText(CUMPLEANIOS.nombre);
  });
});
