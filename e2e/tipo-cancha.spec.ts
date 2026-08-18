import { ADMINISTRADOR, FUTBOL_5, PADEL } from './apoyo/datos';
import { abrirComo, dialogo, expect, notificacion, test } from './apoyo/fixtures';

/**
 * ABM de tipos de cancha, la implementación de referencia del proyecto.
 *
 * Lo que se prueba acá vale para los otros cuatro ABM, que replican esta misma
 * estructura: listado adaptado al tamaño de pantalla, diálogo de formulario que
 * se cierra recién cuando el backend confirma, confirmación antes de borrar y
 * estados explícitos de carga, vacío y error.
 */
test.describe('ABM de tipos de cancha', () => {

  test('lista en una tabla lo que devuelve la API', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

    const filas = page.locator('table tbody tr');

    await expect(filas).toHaveCount(2);
    await expect(filas.first()).toContainText(FUTBOL_5.nombre);
    await expect(filas.first()).toContainText(FUTBOL_5.descripcion);
    await expect(filas.nth(1)).toContainText(PADEL.nombre);
  });

  test('crea uno nuevo y lo suma a la tabla', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

    await page.getByRole('button', { name: 'Nuevo tipo de cancha' }).click();

    const formulario = dialogo(page);

    await expect(formulario.getByRole('heading', { name: 'Nuevo tipo de cancha' })).toBeVisible();

    await formulario.getByLabel('Nombre').fill('Básquet');
    await formulario.getByLabel('Descripción').fill('Piso de parquet techado');
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Tipo de cancha creado correctamente.');
    await expect(page.locator('table tbody tr')).toHaveCount(3);
    await expect(page.locator('table')).toContainText('Piso de parquet techado');

    // Y quedó guardado del otro lado, no solo pintado en la tabla.
    expect(api.estado.tiposCancha.map((tipo) => tipo.nombre)).toContain('Básquet');
  });

  test('no deja crear uno vacío', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

    await page.getByRole('button', { name: 'Nuevo tipo de cancha' }).click();
    await dialogo(page).getByRole('button', { name: 'Crear' }).click();

    await expect(page.getByText('El nombre es obligatorio.')).toBeVisible();
    await expect(page.getByText('La descripción es obligatoria.')).toBeVisible();
    // El diálogo sigue abierto: no se pierde lo que el usuario venía cargando.
    await expect(dialogo(page)).toBeVisible();
  });

  test('el diálogo queda abierto y con los datos cuando el backend rechaza el alta', async ({
    page
  }) => {
    await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

    await page.getByRole('button', { name: 'Nuevo tipo de cancha' }).click();

    const formulario = dialogo(page);

    // El nombre es único: la API responde 400 con su propio mensaje.
    await formulario.getByLabel('Nombre').fill(FUTBOL_5.nombre);
    await formulario.getByLabel('Descripción').fill('Otra descripción');
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(notificacion(page)).toContainText('Ya existe un tipo de cancha con ese nombre');
    await expect(formulario).toBeVisible();
    await expect(formulario.getByLabel('Nombre')).toHaveValue(FUTBOL_5.nombre);
  });

  test('edita uno existente', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

    await page.getByRole('button', { name: `Editar ${PADEL.nombre}` }).click();

    const formulario = dialogo(page);

    await expect(formulario.getByRole('heading', { name: 'Editar tipo de cancha' })).toBeVisible();
    await expect(formulario.getByLabel('Nombre')).toHaveValue(PADEL.nombre);

    await formulario.getByLabel('Descripción').fill('Paredes de vidrio templado');
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Tipo de cancha actualizado correctamente.');
    await expect(page.locator('table')).toContainText('Paredes de vidrio templado');

    const guardado = api.estado.tiposCancha.find((tipo) => tipo.id === PADEL.id);

    expect(guardado?.descripcion).toBe('Paredes de vidrio templado');
  });

  test('pide confirmación antes de borrar, y volver atrás no borra nada', async ({ page, api }) => {
    // Sin canchas asociadas el borrado es posible; lo que se prueba acá es que
    // arrepentirse no tenga efecto.
    api.estado.canchas.length = 0;

    await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

    await page.getByRole('button', { name: `Eliminar ${PADEL.nombre}` }).click();

    const confirmacion = dialogo(page);

    await expect(confirmacion).toContainText(`¿Seguro que querés eliminar "${PADEL.nombre}"?`);

    await confirmacion.getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.locator('table tbody tr')).toHaveCount(2);
    expect(api.estado.tiposCancha).toHaveLength(2);
  });

  test('borra al confirmar', async ({ page, api }) => {
    api.estado.canchas.length = 0;

    await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

    await page.getByRole('button', { name: `Eliminar ${PADEL.nombre}` }).click();
    await dialogo(page).getByRole('button', { name: 'Eliminar' }).click();

    await expect(notificacion(page)).toContainText('Tipo de cancha eliminado correctamente.');
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    expect(api.estado.tiposCancha.map((tipo) => tipo.id)).toEqual([FUTBOL_5.id]);
  });

  test('avisa cuando el tipo está en uso y no lo saca de la tabla', async ({ page }) => {
    // Los datos sembrados tienen canchas de los dos tipos: el backend responde
    // 409 traduciendo la restricción de la base.
    await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

    await page.getByRole('button', { name: `Eliminar ${FUTBOL_5.nombre}` }).click();
    await dialogo(page).getByRole('button', { name: 'Eliminar' }).click();

    await expect(notificacion(page)).toContainText(
      'No se puede eliminar el tipo de cancha porque tiene canchas asociadas'
    );
    await expect(page.locator('table tbody tr')).toHaveCount(2);
  });

  test('con el backend caído ofrece reintentar, y al reintentar carga', async ({ page, api }) => {
    api.fallar('GET', '/tipos-cancha', 0);

    await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

    await expect(
      page.getByRole('heading', { name: 'No se pudieron cargar los tipos de cancha' })
    ).toBeVisible();
    await expect(notificacion(page)).toContainText('No se pudo conectar con el servidor');

    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(page.locator('table tbody tr')).toHaveCount(2);
  });

  test('cuando no hay ninguno, invita a crear el primero', async ({ page, api }) => {
    api.estado.tiposCancha.length = 0;

    await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

    await expect(
      page.getByRole('heading', { name: 'Todavía no hay tipos de cancha' })
    ).toBeVisible();
    await expect(page.locator('table')).toBeHidden();
  });

  test.describe('en pantalla chica', () => {

    test.use({ viewport: { width: 390, height: 844 } });

    test('el listado pasa de tabla a tarjetas', async ({ page }) => {
      await abrirComo(page, ADMINISTRADOR, '/tipos-cancha');

      await expect(page.locator('table')).toBeHidden();
      await expect(page.locator('.tarjetas mat-card')).toHaveCount(2);
      await expect(page.locator('.tarjetas mat-card').first()).toContainText(FUTBOL_5.nombre);
    });

  });

});
