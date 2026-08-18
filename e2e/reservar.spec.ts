import { Locator, Page } from '@playwright/test';
import { ADMINISTRADOR, ANA, CANCHA_1, CANCHA_2, CANCHA_3, MANANA } from './apoyo/datos';
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

/**
 * Reservar una cancha: el caso de uso central de la aplicación.
 *
 * Todo pasa en una sola pantalla —cancha, día, turno libre y a nombre de quién—
 * y el diálogo muestra el resumen antes de mandarlo. Los turnos sembrados son de
 * mañana, así que la pantalla arranca en el día de hoy y sin nada que ofrecer:
 * elegir el día es parte del recorrido.
 */

const turnos = (page: Page): Locator =>
  page.getByRole('listbox', { name: 'Turnos libres' }).getByRole('option');

/**
 * Cambia el día ya con la pantalla cargada.
 *
 * La espera no es de adorno: el campo aparece apenas llegan las canchas, y la
 * primera búsqueda de turnos —la de hoy— todavía está viajando. Escribir la
 * fecha antes dejaría dos pedidos en el aire y la lista mostraría el que llegue
 * último.
 */
const elegirDia = async (page: Page, fecha: string): Promise<void> => {
  await expect(page.getByText('No quedan turnos libres en Cancha 1')).toBeVisible();
  await escribirFecha(page, 'Día', fecha);
};

test.describe('Reservar una cancha', () => {

  test('solo ofrece las canchas habilitadas, con su tipo al lado', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservar');

    await page.getByRole('combobox', { name: 'Cancha' }).click();

    const opciones = page.getByRole('option');

    // La Cancha 3 está en mantenimiento: el backend rechazaría la reserva, así
    // que ni siquiera se ofrece.
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

    // De los tres turnos de mañana de la Cancha 1, el de 18:00 ya está reservado.
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

    // El total lo calcula la pantalla como adelanto: 8000 por hora, una hora.
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

    // El turno reservado desaparece de la lista sin recargar la pantalla.
    await expect(turnos(page)).toHaveText(['11:00 a 12:00']);

    const creada = api.estado.reservas.at(-1);

    expect(creada?.usuarioId).toBe(ANA.id);
    expect(creada?.horarioId).toBe(1);
    // El precio lo calcula el backend, no el navegador.
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
    // Las canchas las administra el complejo: el cliente no tiene a dónde ir.
    await expect(page.getByRole('button', { name: 'Ir a canchas' })).toHaveCount(0);
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
