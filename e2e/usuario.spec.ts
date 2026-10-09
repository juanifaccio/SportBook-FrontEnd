import { ADMINISTRADOR, ANA } from './apoyo/datos';
import { abrirComo, dialogo, expect, notificacion, test } from './apoyo/fixtures';

/**
 * ABM de usuarios.
 *
 * El recorrido del ABM en sí ya lo cubre `tipo-cancha.spec.ts`, que es la
 * implementación de referencia. Lo propio de esta pantalla es que una cuenta con
 * reservas no se borra: las reservas son el historial del complejo.
 */
test.describe('ABM de usuarios', () => {

  test('no borra un usuario que tiene reservas, y lo dice', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/usuarios');

    await page.getByRole('button', { name: `Eliminar ${ANA.nombre}` }).click();
    await dialogo(page).getByRole('button', { name: 'Eliminar' }).click();

    await expect(notificacion(page)).toContainText('tiene reservas asociadas');
    await expect(page.getByRole('button', { name: `Eliminar ${ANA.nombre}` })).toBeVisible();
    expect(api.estado.usuarios.some((usuario) => usuario.id === ANA.id)).toBe(true);
  });

});
