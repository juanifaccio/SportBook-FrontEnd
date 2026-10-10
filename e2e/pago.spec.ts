import { ADMINISTRADOR, ANA, BRUNO, CANCHA_2, PADEL } from './apoyo/datos';
import {
  abrirComo,
  dialogo,
  elegirOpcion,
  expect,
  notificacion,
  test
} from './apoyo/fixtures';

test.describe('Pagos', () => {

  test('lista el pago sembrado con su reserva', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    const filas = page.locator('table tbody tr');

    await expect(filas).toHaveCount(1);
    await expect(filas.first()).toContainText('8.000');
    await expect(filas.first()).toContainText('Efectivo');
    await expect(filas.first()).toContainText('Registrado');
    await expect(filas.first()).toContainText('18:00 a 19:00');
  });

  test('cobrar el total deja la reserva confirmada', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    await page.getByRole('button', { name: 'Registrar un pago' }).click();

    const formulario = dialogo(page);

    await expect(formulario.getByRole('heading', { name: 'Registrar un pago' })).toBeVisible();

    await elegirOpcion(page, 'Reserva', /20:00 a 21:00/);
    await formulario.getByLabel('Monto').fill('6000');
    await elegirOpcion(page, 'Método', 'Transferencia');
    await formulario.getByRole('button', { name: 'Registrar el pago' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Pago registrado correctamente.');

    const creado = api.estado.pagos.at(-1);
    expect(creado?.monto).toBe(6000);
    expect(creado?.reservaId).toBe(2);
    expect(api.estado.reservas.find((reserva) => reserva.id === 2)?.estado).toBe('CONFIRMADA');
  });

  test('un pago parcial deja la reserva pendiente', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    await page.getByRole('button', { name: 'Registrar un pago' }).click();

    const formulario = dialogo(page);

    await elegirOpcion(page, 'Reserva', /20:00 a 21:00/);
    await formulario.getByLabel('Monto').fill('2000');
    await elegirOpcion(page, 'Método', 'Efectivo');
    await formulario.getByRole('button', { name: 'Registrar el pago' }).click();

    await expect(notificacion(page)).toContainText('Pago registrado correctamente.');
    expect(api.estado.reservas.find((reserva) => reserva.id === 2)?.estado).toBe('PENDIENTE');
  });

  test('no deja cobrar más que el saldo', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    await page.getByRole('button', { name: 'Registrar un pago' }).click();

    const formulario = dialogo(page);

    await elegirOpcion(page, 'Reserva', /20:00 a 21:00/);
    await formulario.getByLabel('Monto').fill('99999');
    await formulario.getByRole('button', { name: 'Registrar el pago' }).click();

    await expect(page.getByText('El monto no puede superar lo que falta pagar.')).toBeVisible();
    await expect(formulario).toBeVisible();
  });

  test('solo ofrece las reservas vigentes que deben plata', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    await page.getByRole('button', { name: 'Registrar un pago' }).click();
    await page.getByRole('combobox', { name: 'Reserva' }).click();

    const opciones = page.getByRole('option');

    await expect(opciones).toHaveCount(2);
    await expect(opciones.first()).not.toContainText('18:00 a 19:00');
  });

  test('ofrece cada reserva con el nombre de quien la hizo', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    await page.getByRole('button', { name: 'Registrar un pago' }).click();
    await page.getByRole('combobox', { name: 'Reserva' }).click();

    await expect(page.getByRole('option').first()).toContainText(
      `20:00 a 21:00 · ${CANCHA_2.nombre} (${PADEL.nombre}) · ${BRUNO.nombre}`
    );
    await expect(page.getByRole('option', { name: new RegExp(ANA.nombre) })).toBeVisible();
  });

  test('el campo cerrado sigue mostrando el nombre después de elegir', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    await page.getByRole('button', { name: 'Registrar un pago' }).click();
    await elegirOpcion(page, 'Reserva', /20:00 a 21:00/);

    const campo = page.getByRole('combobox', { name: 'Reserva' });

    await expect(campo).toContainText(`${CANCHA_2.nombre} (${PADEL.nombre})`);
    await expect(campo).toContainText(BRUNO.nombre);
  });

  test('anular el pago devuelve la reserva a pendiente', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    expect(api.estado.reservas.find((reserva) => reserva.id === 1)?.estado).toBe('CONFIRMADA');

    await page.getByRole('button', { name: /^Anular el pago/ }).click();

    const confirmacion = dialogo(page);

    await expect(confirmacion.getByRole('heading', { name: 'Anular el pago' })).toBeVisible();
    await confirmacion.getByRole('button', { name: 'Anular' }).click();

    await expect(notificacion(page)).toContainText('Pago anulado correctamente.');

    expect(api.estado.pagos).toHaveLength(1);
    expect(api.estado.pagos[0].estado).toBe('ANULADO');
    expect(api.estado.reservas.find((reserva) => reserva.id === 1)?.estado).toBe('PENDIENTE');
  });

  test('si el pago ya estaba anulado, lo avisa y la reserva no cambia', async ({ page, api }) => {
    api.fallar('PUT', '/pagos/1/anular', 409, { mensaje: 'El pago ya está anulado' });

    await abrirComo(page, ADMINISTRADOR, '/pagos');

    await page.getByRole('button', { name: /^Anular el pago/ }).click();
    await dialogo(page).getByRole('button', { name: 'Anular' }).click();

    await expect(notificacion(page)).toContainText('El pago ya está anulado');
    expect(api.estado.pagos[0].estado).toBe('REGISTRADO');
    expect(api.estado.reservas.find((reserva) => reserva.id === 1)?.estado).toBe('CONFIRMADA');
  });

  test('corrige el método de un pago ya registrado', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    await page.getByRole('button', { name: /^Corregir el pago/ }).click();

    const formulario = dialogo(page);

    await expect(formulario.getByRole('heading', { name: 'Corregir el pago' })).toBeVisible();
    await expect(formulario.getByLabel('Monto')).toHaveCount(0);
    await expect(formulario).toContainText('8.000');

    await elegirOpcion(page, 'Método', 'Tarjeta');
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(notificacion(page)).toContainText('Pago actualizado correctamente.');
    expect(api.estado.pagos[0].metodo).toBe('TARJETA');
    expect(api.estado.reservas.find((reserva) => reserva.id === 1)?.estado).toBe('CONFIRMADA');
  });

  test('al cliente le muestra sus pagos pero no lo deja registrar', async ({ page }) => {
    await abrirComo(page, ANA, '/pagos');

    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Registrar un pago' })).toHaveCount(0);
    await expect(page.locator('table')).not.toContainText('A nombre de');
  });

  test('otro cliente no ve el pago ajeno', async ({ page }) => {
    await abrirComo(page, BRUNO, '/pagos');

    await expect(page.getByText('Todavía no hay pagos')).toBeVisible();
  });

  test('el detalle de la reserva muestra lo cobrado y lo que falta', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservas');

    await page
      .locator('table tbody tr', { hasText: '20:00 a 21:00' })
      .getByRole('button', { name: 'Ver el detalle' })
      .click();

    const detalle = dialogo(page);

    await expect(detalle).toContainText('Falta pagar');
    await expect(detalle).toContainText('6.000');

    await detalle.getByRole('button', { name: 'Cerrar' }).click();

    await page
      .locator('table tbody tr', { hasText: '18:00 a 19:00' })
      .getByRole('button', { name: 'Ver el detalle' })
      .click();

    const pagada = dialogo(page);

    await expect(pagada).toContainText('Efectivo');
    await expect(pagada).not.toContainText('Falta pagar');
  });
});
