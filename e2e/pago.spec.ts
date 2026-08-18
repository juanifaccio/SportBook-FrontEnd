import { ADMINISTRADOR, ANA, BRUNO } from './apoyo/datos';
import {
  abrirComo,
  dialogo,
  elegirOpcion,
  expect,
  notificacion,
  test
} from './apoyo/fixtures';

/**
 * Los pagos de una reserva, y lo que le hacen a su estado.
 *
 * Una reserva nace PENDIENTE y la confirman sus pagos. Eso es lo que hay que ver
 * acá y no en los unitarios: que cobrar el total la deje CONFIRMADA, que anular
 * el pago la devuelva a PENDIENTE, y que un cliente pueda mirar sus pagos pero
 * no registrar ninguno.
 *
 * De lo sembrado, la reserva #1 de Ana (8000) está paga entera y la #2 de Bruno
 * (6000) no tiene ningún pago.
 */
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
    // Lo cobrado cubre el precio total, así que la reserva queda confirmada.
    expect(api.estado.reservas.find((reserva) => reserva.id === 2)?.estado).toBe('CONFIRMADA');
  });

  // Con una seña la reserva sigue debiendo: no se confirma hasta cobrarla entera.
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

  // Cobrar de más dejaría un saldo negativo que el sistema no sabe devolver.
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

  // La reserva #1 ya está paga y la #4 está cancelada: ninguna admite un cobro.
  test('solo ofrece las reservas vigentes que deben plata', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    await page.getByRole('button', { name: 'Registrar un pago' }).click();
    await page.getByRole('combobox', { name: 'Reserva' }).click();

    const opciones = page.getByRole('option');

    // Quedan la #2 y la #3, que no tienen pagos.
    await expect(opciones).toHaveCount(2);
    await expect(opciones.first()).not.toContainText('18:00 a 19:00');
  });

  test('anular el pago devuelve la reserva a pendiente', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    expect(api.estado.reservas.find((reserva) => reserva.id === 1)?.estado).toBe('CONFIRMADA');

    await page.getByRole('button', { name: /^Anular el pago/ }).click();

    const confirmacion = dialogo(page);

    await expect(confirmacion.getByRole('heading', { name: 'Anular el pago' })).toBeVisible();
    await confirmacion.getByRole('button', { name: 'Anular' }).click();

    await expect(notificacion(page)).toContainText('Pago anulado correctamente.');

    // Anular no es borrar: la fila se conserva como historial.
    expect(api.estado.pagos).toHaveLength(1);
    expect(api.estado.pagos[0].estado).toBe('ANULADO');
    expect(api.estado.reservas.find((reserva) => reserva.id === 1)?.estado).toBe('PENDIENTE');
  });

  test('corrige el método de un pago ya registrado', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/pagos');

    await page.getByRole('button', { name: /^Corregir el pago/ }).click();

    const formulario = dialogo(page);

    await expect(formulario.getByRole('heading', { name: 'Corregir el pago' })).toBeVisible();
    // El monto y la reserva se muestran pero no se pueden tocar.
    await expect(formulario.getByLabel('Monto')).toHaveCount(0);
    await expect(formulario).toContainText('8.000');

    await elegirOpcion(page, 'Método', 'Tarjeta');
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(notificacion(page)).toContainText('Pago actualizado correctamente.');
    expect(api.estado.pagos[0].metodo).toBe('TARJETA');
    // Corregir el método no toca el estado de la reserva.
    expect(api.estado.reservas.find((reserva) => reserva.id === 1)?.estado).toBe('CONFIRMADA');
  });

  test('al cliente le muestra sus pagos pero no lo deja registrar', async ({ page }) => {
    await abrirComo(page, ANA, '/pagos');

    // El pago sembrado es de una reserva de Ana.
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

    // La #2 de Bruno no tiene ningún pago: debe los 6000 enteros.
    await page
      .locator('table tbody tr', { hasText: '20:00 a 21:00' })
      .getByRole('button', { name: 'Ver el detalle' })
      .click();

    const detalle = dialogo(page);

    await expect(detalle).toContainText('Falta pagar');
    await expect(detalle).toContainText('6.000');

    await detalle.getByRole('button', { name: 'Cerrar' }).click();

    // La #1 de Ana está paga: no muestra saldo, pero sí el pago.
    await page
      .locator('table tbody tr', { hasText: '18:00 a 19:00' })
      .getByRole('button', { name: 'Ver el detalle' })
      .click();

    const pagada = dialogo(page);

    await expect(pagada).toContainText('Efectivo');
    await expect(pagada).not.toContainText('Falta pagar');
  });
});
