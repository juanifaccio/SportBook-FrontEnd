import { Locator, Page } from '@playwright/test';
import { ADMINISTRADOR, PECHERAS, PELOTA } from './apoyo/datos';
import { abrirComo, dialogo, expect, notificacion, test } from './apoyo/fixtures';

const abrirDialogo = async (pagina: Page, boton: string | RegExp): Promise<Locator> => {
  await pagina.getByRole('button', { name: boton }).click();

  const formulario = dialogo(pagina);

  await expect(formulario.getByLabel('Nombre')).toBeFocused();

  return formulario;
};

test.describe('ABM de equipamiento', () => {

  test('lista en una tabla lo que devuelve la API, ordenado por nombre', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    const filas = page.locator('table tbody tr');

    await expect(filas).toHaveCount(2);
    await expect(filas.first()).toContainText(PECHERAS.nombre);
    await expect(filas.nth(1)).toContainText(PELOTA.nombre);
    await expect(filas.nth(1)).toContainText(PELOTA.descripcion);
  });

  test('avisa cuál está sin stock', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    await expect(page.locator('table tbody tr').first()).toContainText('Sin stock');
    await expect(page.locator('table tbody tr').nth(1)).toContainText(`${PELOTA.stock}`);
  });

  test('crea uno nuevo y lo suma a la tabla', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    const formulario = await abrirDialogo(page, 'Nuevo equipamiento');

    await expect(formulario.getByRole('heading', { name: 'Nuevo equipamiento' })).toBeVisible();

    await formulario.getByLabel('Nombre').fill('Paleta de pádel');
    await formulario.getByLabel('Descripción').fill('De fibra de vidrio');
    await formulario.getByLabel('Precio por unidad').fill('2000');
    await formulario.getByLabel('Stock').fill('6');
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Equipamiento creado correctamente.');
    await expect(page.locator('table tbody tr')).toHaveCount(3);
    await expect(page.locator('table')).toContainText('De fibra de vidrio');

    const guardado = api.estado.equipamientos.find((item) => item.nombre === 'Paleta de pádel');

    expect(guardado?.precio).toBe(2000);
    expect(guardado?.stock).toBe(6);
  });

  test('deja crear uno con stock cero', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    const formulario = await abrirDialogo(page, 'Nuevo equipamiento');

    await formulario.getByLabel('Nombre').fill('Red de vóley');
    await formulario.getByLabel('Descripción').fill('Reglamentaria');
    await formulario.getByLabel('Precio por unidad').fill('3000');
    await formulario.getByLabel('Stock').fill('0');
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(formulario).toBeHidden();
    expect(api.estado.equipamientos.find((item) => item.nombre === 'Red de vóley')?.stock).toBe(0);
  });

  test('no deja crear uno vacío', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    const formulario = await abrirDialogo(page, 'Nuevo equipamiento');

    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(page.getByText('El nombre es obligatorio.')).toBeVisible();
    await expect(page.getByText('La descripción es obligatoria.')).toBeVisible();
    await expect(page.getByText('El precio es obligatorio.')).toBeVisible();
    await expect(page.getByText('El stock es obligatorio.')).toBeVisible();
    await expect(formulario).toBeVisible();
  });

  test('no deja cargar un precio de cero', async ({ page }) => {
    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    const formulario = await abrirDialogo(page, 'Nuevo equipamiento');

    await formulario.getByLabel('Nombre').fill('Silbato');
    await formulario.getByLabel('Descripción').fill('Metálico');
    await formulario.getByLabel('Precio por unidad').fill('0');
    await formulario.getByLabel('Stock').fill('3');
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(page.getByText('El precio tiene que ser mayor a cero.')).toBeVisible();
    await expect(formulario).toBeVisible();
  });

  test('el diálogo queda abierto y con los datos cuando el backend rechaza el alta', async ({
    page
  }) => {
    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    const formulario = await abrirDialogo(page, 'Nuevo equipamiento');

    await formulario.getByLabel('Nombre').fill(PELOTA.nombre);
    await formulario.getByLabel('Descripción').fill('Otra descripción');
    await formulario.getByLabel('Precio por unidad').fill('1000');
    await formulario.getByLabel('Stock').fill('2');
    await formulario.getByRole('button', { name: 'Crear' }).click();

    await expect(notificacion(page)).toContainText('Ya existe un equipamiento con ese nombre');
    await expect(formulario).toBeVisible();
    await expect(formulario.getByLabel('Nombre')).toHaveValue(PELOTA.nombre);
  });

  test('edita uno existente', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    const formulario = await abrirDialogo(page, `Editar ${PELOTA.nombre}`);

    await expect(formulario.getByRole('heading', { name: 'Editar equipamiento' })).toBeVisible();
    await expect(formulario.getByLabel('Nombre')).toHaveValue(PELOTA.nombre);
    await expect(formulario.getByLabel('Stock')).toHaveValue(`${PELOTA.stock}`);

    await formulario.getByLabel('Stock').fill('25');
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(formulario).toBeHidden();
    await expect(notificacion(page)).toContainText('Equipamiento actualizado correctamente.');

    expect(api.estado.equipamientos.find((item) => item.id === PELOTA.id)?.stock).toBe(25);
  });

  test('pide confirmación antes de borrar, y volver atrás no borra nada', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    await page.getByRole('button', { name: `Eliminar ${PELOTA.nombre}` }).click();

    const confirmacion = dialogo(page);

    await expect(confirmacion).toContainText(`¿Seguro que querés eliminar "${PELOTA.nombre}"?`);

    await confirmacion.getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.locator('table tbody tr')).toHaveCount(2);
    expect(api.estado.equipamientos).toHaveLength(2);
  });

  test('borra al confirmar', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    await page.getByRole('button', { name: `Eliminar ${PELOTA.nombre}` }).click();
    await dialogo(page).getByRole('button', { name: 'Eliminar' }).click();

    await expect(notificacion(page)).toContainText('Equipamiento eliminado correctamente.');
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    expect(api.estado.equipamientos.map((item) => item.id)).toEqual([PECHERAS.id]);
  });

  test('no borra uno que alguna reserva incluye, y lo dice', async ({ page, api }) => {
    api.estado.reservaEquipamientos.push({
      id: 1,
      cantidad: 2,
      subtotal: 3000,
      reservaId: 2,
      equipamientoId: PELOTA.id
    });

    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    await page.getByRole('button', { name: `Eliminar ${PELOTA.nombre}` }).click();
    await dialogo(page).getByRole('button', { name: 'Eliminar' }).click();

    await expect(notificacion(page)).toContainText('hay reservas que lo incluyen');
    await expect(page.locator('table tbody tr')).toHaveCount(2);
    expect(api.estado.equipamientos).toHaveLength(2);
  });

  test('con el backend caído ofrece reintentar, y al reintentar carga', async ({ page, api }) => {
    api.fallar('GET', '/equipamientos', 0);

    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    await expect(
      page.getByRole('heading', { name: 'No se pudo cargar el equipamiento' })
    ).toBeVisible();
    await expect(notificacion(page)).toContainText('No se pudo conectar con el servidor');

    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(page.locator('table tbody tr')).toHaveCount(2);
  });

  test('cuando no hay ninguno, invita a crear el primero', async ({ page, api }) => {
    api.estado.equipamientos.length = 0;

    await abrirComo(page, ADMINISTRADOR, '/equipamientos');

    await expect(page.getByRole('heading', { name: 'Todavía no hay equipamiento' })).toBeVisible();
    await expect(page.locator('table')).toBeHidden();
  });

  test.describe('en pantalla chica', () => {

    test.use({ viewport: { width: 390, height: 844 } });

    test('el listado pasa de tabla a tarjetas', async ({ page }) => {
      await abrirComo(page, ADMINISTRADOR, '/equipamientos');

      await expect(page.locator('table')).toBeHidden();
      await expect(page.locator('.tarjetas mat-card')).toHaveCount(2);
      await expect(page.locator('.tarjetas mat-card').nth(1)).toContainText(PELOTA.nombre);
    });

  });

});
