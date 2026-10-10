import { Locator, Page } from '@playwright/test';
import { ADMINISTRADOR, ANA, BRUNO, MANANA, PELOTA } from './apoyo/datos';
import {
  abrirComo,
  contenedorDe,
  dialogo,
  diaMesAnio,
  elegirOpcion,
  escribirFecha,
  expect,
  notificacion,
  test,
  tooltip
} from './apoyo/fixtures';

const filas = (page: Page): Locator => page.locator('table tbody tr');

const fila = (page: Page, horario: string): Locator =>
  filas(page).filter({ hasText: horario });

test.describe('Gestión de reservas', () => {

  test('el administrador ve las reservas de todo el complejo', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await expect(filas(page)).toHaveCount(4);
    await expect(page.locator('table')).toContainText(ANA.nombre);
    await expect(page.locator('table')).toContainText(BRUNO.nombre);
  });

  test('el cliente ve solo las suyas, y sin la columna del usuario', async ({ page }) => {
    await abrirComo(page, ANA, '/reservas');

    await expect(filas(page)).toHaveCount(3);
    await expect(page.locator('table')).not.toContainText(BRUNO.nombre);
    await expect(page.getByRole('columnheader', { name: 'Usuario' })).toHaveCount(0);
  });

  test('filtra por estado', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await elegirOpcion(page, 'Estado', 'Cancelada');

    await expect(filas(page)).toHaveCount(1);
    await expect(filas(page).first()).toContainText('08:00 a 09:00');
  });

  test('filtra por cancha', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await elegirOpcion(page, 'Cancha', 'Cancha 2');

    await expect(filas(page)).toHaveCount(2);
    await expect(page.locator('table')).not.toContainText('Cancha 1');
  });

  test('filtra por día y el filtro se puede quitar', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await escribirFecha(page, 'Día', MANANA);

    await expect(filas(page)).toHaveCount(3);

    await page.getByRole('button', { name: 'Quitar el filtro de día' }).click();

    await expect(filas(page)).toHaveCount(4);
  });

  test('cuando ningún filtro da resultados, ofrece limpiarlos', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await elegirOpcion(page, 'Cancha', 'Cancha 1');
    await elegirOpcion(page, 'Estado', 'Cancelada');

    await expect(
      page.getByRole('heading', { name: 'Ninguna reserva coincide con los filtros' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();

    await expect(filas(page)).toHaveCount(4);
  });

  test('el detalle muestra lo que no entra en la fila', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await fila(page, '18:00 a 19:00').getByRole('button', { name: 'Ver el detalle' }).click();

    const detalle = dialogo(page);

    await expect(detalle.getByRole('heading', { name: 'Reserva #1' })).toBeVisible();
    await expect(detalle).toContainText(ANA.email);
    await expect(detalle).toContainText(ANA.telefono);
    await expect(detalle).toContainText('Confirmada');
    await expect(detalle).toContainText('Cumpleaños de 15');
    await expect(detalle).toContainText('40 personas');

    await detalle.getByRole('button', { name: 'Cerrar' }).click();

    await expect(detalle).toBeHidden();
  });

  test('el detalle de una reserva sin evento no muestra esa fila', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await fila(page, '20:00 a 21:00').getByRole('button', { name: 'Ver el detalle' }).click();

    const detalle = dialogo(page);

    await expect(detalle.getByRole('heading', { name: 'Reserva #2' })).toBeVisible();
    await expect(detalle).not.toContainText('Evento');
    await expect(detalle).not.toContainText('Equipamiento');
  });

  test('el detalle muestra el equipamiento alquilado con su subtotal', async ({ page, api }) => {
    api.estado.reservaEquipamientos.push({
      id: 1,
      cantidad: 3,
      subtotal: 4500,
      reservaId: 2,
      equipamientoId: PELOTA.id
    });

    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await fila(page, '20:00 a 21:00').getByRole('button', { name: 'Ver el detalle' }).click();

    const detalle = dialogo(page);

    await expect(detalle).toContainText('Equipamiento');
    await expect(detalle).toContainText(`3 × ${PELOTA.nombre}`);
    await expect(detalle).toContainText('4.500');
  });

  test('cancelar deja la reserva en el historial y devuelve el turno a los libres', async ({
    page,
    api
  }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await fila(page, '18:00 a 19:00').getByRole('button', { name: 'Cancelar la reserva' }).click();

    const confirmacion = dialogo(page);

    await expect(confirmacion).toContainText('El turno va a volver a quedar libre.');

    await confirmacion.getByRole('button', { name: 'Sí, cancelar' }).click();

    await expect(notificacion(page)).toContainText('Reserva cancelada. El turno volvió a quedar libre.');

    await expect(filas(page)).toHaveCount(4);
    await expect(fila(page, '18:00 a 19:00')).toContainText('Cancelada');

    expect(api.estado.reservas.find((reserva) => reserva.id === 1)?.estado).toBe('CANCELADA');

    await page.getByRole('link', { name: 'Reservar' }).click();

    await expect(page).toHaveURL(/\/reservar$/);
    await expect(page.getByText('No quedan turnos libres en Cancha 1')).toBeVisible();

    await escribirFecha(page, 'Día', MANANA);

    await expect(
      page.getByRole('listbox', { name: 'Turnos libres' }).getByRole('option')
    ).toHaveText(['10:00 a 11:00', '11:00 a 12:00', '18:00 a 19:00']);
  });

  test('si la reserva empezó mientras tanto, lo avisa y no la cancela', async ({ page, api }) => {
    api.fallar('PUT', '/reservas/1/cancelar', 400, {
      mensaje: 'La reserva ya empezó y no se puede modificar'
    });

    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await fila(page, '18:00 a 19:00').getByRole('button', { name: 'Cancelar la reserva' }).click();
    await dialogo(page).getByRole('button', { name: 'Sí, cancelar' }).click();

    await expect(notificacion(page)).toContainText('La reserva ya empezó');
    await expect(fila(page, '18:00 a 19:00')).not.toContainText('Cancelada');
    expect(api.estado.reservas.find((reserva) => reserva.id === 1)?.estado).toBe('CONFIRMADA');
  });

  test('reprogramar mueve la reserva a otro turno y libera el que tenía', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await fila(page, '18:00 a 19:00')
      .getByRole('button', { name: 'Reprogramar la reserva' })
      .click();

    const reprogramar = dialogo(page);

    await expect(reprogramar.getByRole('heading', { name: 'Reprogramar reserva' })).toBeVisible();
    await expect(reprogramar).toContainText(
      `Hoy está en Cancha 1, el ${diaMesAnio(MANANA)} de 18:00 a 19:00.`
    );

    await escribirFecha(reprogramar, 'Día', MANANA);
    await reprogramar.getByRole('option', { name: '11:00 a 12:00' }).click();
    await reprogramar.getByRole('button', { name: 'Reprogramar' }).click();

    await expect(reprogramar).toBeHidden();
    await expect(notificacion(page)).toContainText('Reserva reprogramada correctamente.');
    await expect(fila(page, '11:00 a 12:00')).toContainText(ANA.nombre);

    const reserva = api.estado.reservas.find((item) => item.id === 1);

    expect(reserva?.horarioId).toBe(2);
    expect(reserva?.horaInicio).toBe('11:00');
    expect(api.estado.horarios.find((turno) => turno.id === 3)?.disponible).toBe(true);
    expect(api.estado.horarios.find((turno) => turno.id === 2)?.disponible).toBe(false);
  });

  test('una reserva cancelada o que ya empezó no se puede tocar, y se dice por qué', async ({
    page
  }) => {
    await abrirComo(page, ANA, '/reservas');

    const cancelada = fila(page, '08:00 a 09:00');
    const yaEmpezo = fila(page, '10:00 a 11:00');

    await expect(cancelada.getByRole('button', { name: 'Reprogramar la reserva' })).toBeDisabled();
    await expect(cancelada.getByRole('button', { name: 'Cancelar la reserva' })).toBeDisabled();
    await expect(yaEmpezo.getByRole('button', { name: 'Reprogramar la reserva' })).toBeDisabled();

    await contenedorDe(cancelada, 'Cancelar la reserva').hover();
    await expect(tooltip(page)).toContainText('La reserva está cancelada');
  });

  test('sin ninguna reserva, invita a reservar', async ({ page, api }) => {
    api.estado.reservas.length = 0;

    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await expect(page.getByRole('heading', { name: 'Todavía no hay reservas' })).toBeVisible();

    await page.getByRole('button', { name: 'Reservar una cancha' }).click();

    await expect(page).toHaveURL(/\/reservar$/);
  });

  test('con el backend caído ofrece reintentar', async ({ page, api }) => {
    api.fallar('GET', '/reservas', 0);

    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await expect(
      page.getByRole('heading', { name: 'No se pudieron cargar las reservas' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(filas(page)).toHaveCount(4);
  });

  test.describe('en pantalla chica', () => {

    test.use({ viewport: { width: 390, height: 844 } });

    test('el listado pasa de tabla a tarjetas', async ({ page }) => {
      await abrirComo(page, ANA, '/reservas');

      await expect(page.locator('table')).toBeHidden();
      await expect(page.locator('.tarjetas mat-card')).toHaveCount(3);
      await expect(page.locator('.tarjetas mat-card').first()).toContainText('Cancha 1');
    });

  });

});
