import { Locator, Page } from '@playwright/test';
import {
  ADMINISTRADOR,
  ANA,
  CANCHA_1,
  CANCHA_2,
  CANCHA_3,
  MANANA,
  PECHERAS,
  PELOTA
} from './apoyo/datos';
import {
  abrirComo,
  dialogo,
  diaMesAnio,
  elegirOpcion,
  escribirFecha,
  expect,
  notificacion,
  test
} from './apoyo/fixtures';

const turnos = (page: Page): Locator =>
  page.getByRole('listbox', { name: 'Turnos libres' }).getByRole('option');

const elegirDia = async (page: Page, fecha: string): Promise<void> => {
  await expect(page.getByText('No quedan turnos libres en Cancha 1')).toBeVisible();
  await escribirFecha(page, 'Día', fecha);
};

test.describe('Reservar una cancha', () => {

  test('solo ofrece las canchas habilitadas, con su tipo al lado', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservar');

    await page.getByRole('combobox', { name: 'Cancha' }).click();

    const opciones = page.getByRole('option');

    await expect(opciones).toHaveCount(2);
    await expect(opciones.first()).toContainText(`${CANCHA_1.nombre} (Fútbol 5)`);
    await expect(opciones.nth(1)).toContainText(`${CANCHA_2.nombre} (Pádel)`);
    await expect(page.getByRole('option', { name: CANCHA_3.nombre })).toHaveCount(0);
  });

  test('el día de hoy no tiene turnos y lo dice', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservar');

    await expect(page.getByText('No quedan turnos libres en Cancha 1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reservar' })).toBeDisabled();
  });

  test('al elegir el día aparecen los turnos libres de esa cancha', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservar');

    await elegirDia(page, MANANA);

    await expect(turnos(page)).toHaveText(['10:00 a 11:00', '11:00 a 12:00']);
  });

  test('cambiar de cancha vuelve a buscar los turnos de esa cancha', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservar');

    await elegirDia(page, MANANA);
    await expect(turnos(page)).toHaveCount(2);

    await elegirOpcion(page, 'Cancha', /Cancha 2/);

    await expect(turnos(page)).toHaveText(['09:00 a 10:30', '08:00 a 09:00']);
  });

  test('el administrador reserva a nombre de otro y el turno deja de ofrecerse', async ({
    page,
    api
  }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservar');

    await elegirDia(page, MANANA);
    await turnos(page).first().click();

    const resumen = page.locator('.resumen');

    await expect(resumen).toContainText(`${CANCHA_1.nombre} (Fútbol 5)`);
    await expect(resumen).toContainText(`${diaMesAnio(MANANA)}, de 10:00 a 11:00`);
    await expect(resumen).toContainText('8.000');

    await elegirOpcion(page, 'Usuario', new RegExp(ANA.nombre));
    await page.getByRole('button', { name: 'Reservar' }).click();

    const confirmacion = dialogo(page);

    await expect(confirmacion.getByRole('heading', { name: 'Confirmar reserva' })).toBeVisible();
    await expect(confirmacion).toContainText(ANA.nombre);

    await confirmacion.getByRole('button', { name: 'Confirmar reserva' }).click();

    await expect(confirmacion).toBeHidden();
    await expect(notificacion(page)).toContainText('Reserva confirmada correctamente.');

    await expect(turnos(page)).toHaveText(['11:00 a 12:00']);

    const creada = api.estado.reservas.at(-1);

    expect(creada?.usuarioId).toBe(ANA.id);
    expect(creada?.horarioId).toBe(1);
    expect(creada?.precioTotal).toBe(8000);
    expect(api.estado.horarios.find((turno) => turno.id === 1)?.disponible).toBe(false);
  });

  test('el cliente reserva para sí mismo: no hay a quién elegir', async ({ page, api }) => {
    await abrirComo(page, ANA, '/reservar');

    await expect(page.getByRole('combobox', { name: 'Usuario' })).toHaveCount(0);
    await expect(page.getByText('Elegí un turno para reservar.')).toBeVisible();

    await elegirDia(page, MANANA);
    await turnos(page).first().click();
    await page.getByRole('button', { name: 'Reservar' }).click();
    await dialogo(page).getByRole('button', { name: 'Confirmar reserva' }).click();

    await expect(notificacion(page)).toContainText('Reserva confirmada correctamente.');

    expect(api.estado.reservas.at(-1)?.usuarioId).toBe(ANA.id);
  });

  test('si alguien se adelantó con el turno, lo avisa y el diálogo sigue abierto', async ({
    page,
    api
  }) => {
    api.fallar('POST', '/reservas', 409, { mensaje: 'El turno ya fue reservado' });

    await abrirComo(page, ANA, '/reservar');

    await elegirDia(page, MANANA);
    await turnos(page).first().click();
    await page.getByRole('button', { name: 'Reservar' }).click();
    await dialogo(page).getByRole('button', { name: 'Confirmar reserva' }).click();

    await expect(notificacion(page)).toContainText('El turno ya fue reservado');
    await expect(dialogo(page)).toBeVisible();
    expect(api.estado.reservas).toHaveLength(4);
  });

  test('sin canchas habilitadas explica qué falta, y al cliente no le ofrece arreglarlo', async ({
    page,
    api
  }) => {
    for (const cancha of api.estado.canchas) {
      cancha.estado = 'MANTENIMIENTO';
    }

    await abrirComo(page, ANA, '/reservar');

    await expect(page.getByRole('heading', { name: 'No hay canchas disponibles' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ir a canchas' })).toHaveCount(0);
  });

  test('reserva declarando un evento y lo guarda junto con la reserva', async ({ page, api }) => {
    await abrirComo(page, ANA, '/reservar');
    await elegirDia(page, MANANA);
    await turnos(page).first().click();

    await page.getByRole('checkbox', { name: 'Es para un evento' }).check();
    await elegirOpcion(page, 'Tipo de evento', 'Torneo');
    await page.getByLabel('Descripción').fill('Torneo relámpago');
    await page.getByLabel('Cantidad de personas').fill('16');

    await page.getByRole('button', { name: 'Reservar' }).click();

    const confirmacion = dialogo(page);

    await expect(confirmacion).toContainText('Torneo relámpago');
    await expect(confirmacion).toContainText('16 personas');

    await confirmacion.getByRole('button', { name: 'Confirmar reserva' }).click();

    await expect(confirmacion).toBeHidden();
    await expect(notificacion(page)).toContainText('Reserva confirmada correctamente.');

    const creada = api.estado.reservas.at(-1);
    const evento = api.estado.eventos.at(-1);

    expect(evento?.descripcion).toBe('Torneo relámpago');
    expect(evento?.cantidadPersonas).toBe(16);
    expect(evento?.reservaId).toBe(creada?.id);
  });

  test('no deja confirmar con el evento marcado a medio completar', async ({ page }) => {
    await abrirComo(page, ANA, '/reservar');
    await elegirDia(page, MANANA);
    await turnos(page).first().click();

    await expect(page.getByRole('button', { name: 'Reservar' })).toBeEnabled();

    await page.getByRole('checkbox', { name: 'Es para un evento' }).check();

    await expect(page.getByRole('button', { name: 'Reservar' })).toBeDisabled();

    await page.getByRole('checkbox', { name: 'Es para un evento' }).uncheck();

    await expect(page.getByRole('button', { name: 'Reservar' })).toBeEnabled();
  });

  test('si el evento falla avisa pero la reserva queda hecha', async ({ page, api }) => {
    api.fallar('POST', '/eventos', 500, { mensaje: 'Error al crear el evento' });

    await abrirComo(page, ANA, '/reservar');
    await elegirDia(page, MANANA);
    await turnos(page).first().click();

    await page.getByRole('checkbox', { name: 'Es para un evento' }).check();
    await elegirOpcion(page, 'Tipo de evento', 'Torneo');
    await page.getByLabel('Descripción').fill('Torneo relámpago');
    await page.getByLabel('Cantidad de personas').fill('16');

    await page.getByRole('button', { name: 'Reservar' }).click();
    await dialogo(page).getByRole('button', { name: 'Confirmar reserva' }).click();

    await expect(dialogo(page)).toBeHidden();
    await expect(
      notificacion(page).filter({ hasText: 'el evento no se pudo guardar' })
    ).toBeVisible();
    expect(api.estado.reservas).toHaveLength(5);
    expect(api.estado.eventos).toHaveLength(1);
  });

  test('reserva alquilando equipamiento y el total lo suma', async ({ page, api }) => {
    await abrirComo(page, ANA, '/reservar');
    await elegirDia(page, MANANA);
    await turnos(page).first().click();

    await page.getByRole('checkbox', { name: 'Alquilar equipamiento' }).check();

    const lista = page.getByRole('list', { name: 'Equipamiento para alquilar' });

    await expect(lista).toContainText(`${PELOTA.nombre}`);
    await expect(lista).toContainText('quedan 10');
    await expect(lista).toContainText('sin unidades para este turno');
    await expect(
      page.getByRole('button', { name: `Agregar una unidad de ${PECHERAS.nombre}` })
    ).toBeDisabled();

    const agregarPelota = page.getByRole('button', { name: `Agregar una unidad de ${PELOTA.nombre}` });

    await agregarPelota.click();
    await agregarPelota.click();

    const resumen = page.locator('.resumen');

    await expect(resumen).toContainText(`2 × ${PELOTA.nombre}`);
    await expect(resumen).toContainText('11.000');

    await page.getByRole('button', { name: 'Reservar' }).click();

    const confirmacion = dialogo(page);

    await expect(confirmacion).toContainText(`2 × ${PELOTA.nombre}`);
    await expect(confirmacion).toContainText('3.000');

    await confirmacion.getByRole('button', { name: 'Confirmar reserva' }).click();

    await expect(confirmacion).toBeHidden();
    await expect(notificacion(page)).toContainText('Reserva confirmada correctamente.');

    const creada = api.estado.reservas.at(-1);

    expect(creada?.precioTotal).toBe(11000);
    expect(api.estado.reservaEquipamientos).toEqual([
      { id: 1, reservaId: creada?.id, equipamientoId: PELOTA.id, cantidad: 2, subtotal: 3000 }
    ]);
  });

  test('lo alquilado en un turno no se ofrece en los que se le superponen', async ({
    page,
    api
  }) => {
    api.estado.reservas.push({
      id: 5,
      fecha: MANANA,
      horaInicio: '10:00',
      horaFin: '11:00',
      estado: 'PENDIENTE',
      precioTotal: 23000,
      usuarioId: ANA.id,
      canchaId: CANCHA_1.id,
      horarioId: 1
    });
    api.estado.reservaEquipamientos.push({
      id: 1,
      cantidad: 10,
      subtotal: 15000,
      reservaId: 5,
      equipamientoId: PELOTA.id
    });

    await abrirComo(page, ANA, '/reservar');
    await elegirDia(page, MANANA);
    await elegirOpcion(page, 'Cancha', /Cancha 2/);

    await page.getByRole('checkbox', { name: 'Alquilar equipamiento' }).check();

    const lista = page.getByRole('list', { name: 'Equipamiento para alquilar' });
    const agregarPelota = page.getByRole('button', { name: `Agregar una unidad de ${PELOTA.nombre}` });

    await turnos(page).filter({ hasText: '09:00 a 10:30' }).click();

    await expect(lista).not.toContainText('quedan');
    await expect(agregarPelota).toBeDisabled();

    await turnos(page).filter({ hasText: '08:00 a 09:00' }).click();

    await expect(lista).toContainText('quedan 10');
    await expect(agregarPelota).toBeEnabled();
  });

  test('con el backend caído ofrece reintentar', async ({ page, api }) => {
    api.fallar('GET', '/canchas', 0);

    await abrirComo(page, ADMINISTRADOR, '/reservar');

    await expect(
      page.getByRole('heading', { name: 'No se pudo cargar la pantalla' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(page.getByRole('combobox', { name: 'Cancha' })).toBeVisible();
  });

});
