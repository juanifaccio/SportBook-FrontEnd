import { ADMINISTRADOR, ANA } from './apoyo/datos';
import { abrirComo, dialogo, expect, notificacion, test } from './apoyo/fixtures';

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
