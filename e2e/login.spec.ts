import { ADMINISTRADOR, ANA } from './apoyo/datos';
import { abrirComo, expect, notificacion, test } from './apoyo/fixtures';

/**
 * Inicio de sesión: la puerta de entrada a la aplicación.
 *
 * Es el único archivo que recorre el formulario de login de verdad; el resto de
 * las pantallas se abren con la sesión ya armada.
 */
test.describe('Inicio de sesión', () => {

  test('sin sesión, cualquier pantalla manda al login y se acuerda de a dónde iba', async ({
    page
  }) => {
    await page.goto('/reservas');

    await expect(page).toHaveURL(/\/login\?volverA=%2Freservas$/);
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('no manda el formulario incompleto: muestra los errores y no llama al backend', async ({
    page
  }) => {
    const llamadas: string[] = [];

    page.on('request', (pedido) => {
      if (pedido.url().includes('/api/auth/login')) {
        llamadas.push(pedido.url());
      }
    });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText('El email es obligatorio.')).toBeVisible();
    await expect(page.getByText('La contraseña es obligatoria.')).toBeVisible();
    expect(llamadas).toHaveLength(0);
  });

  test('marca el email mal escrito antes de intentarlo', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('lucia');
    await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText('Escribí un email válido.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('avisa cuando las credenciales no sirven y deja reintentar', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill(ADMINISTRADOR.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('la-que-no-es');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(notificacion(page)).toContainText('Email o contraseña incorrectos');
    await expect(page).toHaveURL(/\/login/);

    // El botón vuelve a quedar habilitado: el usuario corrige y prueba de nuevo.
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
  });

  test('entra, saluda por nombre y aterriza en reservar', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill(ADMINISTRADOR.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(ADMINISTRADOR.contrasena);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/reservar$/);
    await expect(notificacion(page)).toContainText(`Hola, ${ADMINISTRADOR.nombre}.`);
    await expect(page.getByRole('heading', { name: 'Reservar una cancha' })).toBeVisible();
  });

  test('devuelve al usuario a la pantalla que había pedido', async ({ page }) => {
    await page.goto('/reservas');

    await page.getByLabel('Email').fill(ANA.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(ANA.contrasena);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/reservas$/);
    await expect(page.getByRole('heading', { name: 'Reservas' })).toBeVisible();
  });

  test('la contraseña se puede mostrar y volver a ocultar', async ({ page }) => {
    await page.goto('/login');

    const campo = page.getByLabel('Contraseña', { exact: true });

    await campo.fill('admin123');
    await expect(campo).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Mostrar la contraseña' }).click();
    await expect(campo).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: 'Ocultar la contraseña' }).click();
    await expect(campo).toHaveAttribute('type', 'password');
  });

  test('la sesión sobrevive a recargar la página', async ({ page }) => {
    await abrirComo(page, ANA, '/reservar');
    await expect(page.getByRole('heading', { name: 'Reservar una cancha' })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/reservar$/);
    await expect(page.getByRole('heading', { name: 'Reservar una cancha' })).toBeVisible();
  });

  test('quien ya entró no vuelve a ver el login', async ({ page }) => {
    await abrirComo(page, ANA, '/login');

    await expect(page).toHaveURL(/\/reservar$/);
  });

  test('cerrar sesión vuelve al login y olvida la sesión', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/reservar');

    await page.getByRole('button', { name: 'Menú de la cuenta' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/\/login$/);

    const guardado = await page.evaluate(() => localStorage.getItem('sportbook.token'));

    expect(guardado).toBeNull();
  });

  test('una sesión que el backend ya no acepta se cierra sola al arrancar', async ({
    page,
    api
  }) => {
    // La cuenta se dio de baja mientras el token seguía guardado en el navegador:
    // el `GET /auth/yo` del arranque devuelve 401 y el interceptor desloguea.
    const ana = api.estado.usuarios.find((usuario) => usuario.id === ANA.id);

    if (ana) {
      ana.activo = false;
    }

    await abrirComo(page, ANA, '/reservar');

    await expect(page).toHaveURL(/\/login$/);
  });

});
