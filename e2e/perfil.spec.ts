import { Page } from '@playwright/test';
import { ADMINISTRADOR, ANA } from './apoyo/datos';
import { abrirComo, expect, notificacion, test } from './apoyo/fixtures';

/**
 * Mi perfil: la cuenta propia de quien está conectado.
 *
 * Es la pantalla que evita que un cliente dependa del complejo para corregir sus
 * propios datos. Sirve a los dos roles por igual, así que lo que hay que ver acá
 * —y no en los unitarios— es que se llegue desde el menú de la cuenta y que el
 * nombre cambiado se refleje en la barra superior sin recargar.
 */

const abrirMenuDeLaCuenta = (page: Page) =>
  page.getByRole('button', { name: 'Menú de la cuenta' }).click();

test.describe('Mi perfil', () => {

  test('se llega desde el menú de la cuenta y muestra los datos propios', async ({ page }) => {
    await abrirComo(page, ANA, '/reservar');

    await abrirMenuDeLaCuenta(page);
    await page.getByRole('menuitem', { name: 'Mi perfil' }).click();

    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
    await expect(page.getByLabel('Nombre')).toHaveValue(ANA.nombre);
    await expect(page.getByLabel('Email')).toHaveValue(ANA.email);
    await expect(page.getByLabel('Teléfono')).toHaveValue(ANA.telefono);
  });

  // Se muestran, pero no hay ningún control para cambiarlos: los administra el
  // complejo.
  test('el nivel de acceso y el estado de la cuenta no se pueden editar', async ({ page }) => {
    await abrirComo(page, ANA, '/perfil');

    await expect(page.getByText('Cliente')).toBeVisible();
    await expect(page.getByText('Activa')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Nivel de acceso' })).toHaveCount(0);
  });

  test('guarda los datos y el nombre nuevo aparece en la barra superior', async ({ page, api }) => {
    await abrirComo(page, ANA, '/perfil');

    await page.getByLabel('Nombre').fill('Ana Gómez Pérez');
    await page.getByLabel('Teléfono').fill('3415559999');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(notificacion(page)).toContainText('Datos actualizados correctamente.');

    // La barra superior lee la sesión: si no se refrescara, seguiría mostrando
    // el nombre anterior hasta recargar.
    await expect(page.getByRole('button', { name: 'Menú de la cuenta' })).toContainText(
      'Ana Gómez Pérez'
    );

    const guardada = api.estado.usuarios.find((usuario) => usuario.id === ANA.id);
    expect(guardada?.nombre).toBe('Ana Gómez Pérez');
    expect(guardada?.telefono).toBe('3415559999');
  });

  test('no deja guardar un email con formato inválido', async ({ page }) => {
    await abrirComo(page, ANA, '/perfil');

    await page.getByLabel('Email').fill('sin-arroba');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('El email tiene que tener un formato válido.')).toBeVisible();
  });

  test('avisa cuando el email ya es de otra cuenta', async ({ page, api }) => {
    await abrirComo(page, ANA, '/perfil');

    await page.getByLabel('Email').fill(ADMINISTRADOR.email);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(notificacion(page)).toContainText('Ya existe un usuario con ese email');

    const guardada = api.estado.usuarios.find((usuario) => usuario.id === ANA.id);
    expect(guardada?.email).toBe(ANA.email);
  });

  test('cambia la contraseña y la nueva sirve para volver a entrar', async ({ page, api }) => {
    await abrirComo(page, ANA, '/perfil');

    await page.getByLabel('Contraseña actual').fill(ANA.contrasena);
    await page.getByLabel('Contraseña nueva').fill('claveNueva456');
    await page.getByRole('button', { name: 'Cambiar la contraseña' }).click();

    await expect(notificacion(page)).toContainText('Contraseña actualizada correctamente.');

    // Los campos se vacían: dejarlas escritas en pantalla no le sirve a nadie.
    await expect(page.getByLabel('Contraseña actual')).toHaveValue('');
    await expect(page.getByLabel('Contraseña nueva')).toHaveValue('');

    const guardada = api.estado.usuarios.find((usuario) => usuario.id === ANA.id);
    expect(guardada?.contrasena).toBe('claveNueva456');
  });

  // El backend responde 400 y no 401 justamente para esto: equivocarse al
  // tipear no tiene que echar al usuario de su sesión.
  test('con la contraseña actual incorrecta avisa y no cierra la sesión', async ({ page, api }) => {
    await abrirComo(page, ANA, '/perfil');

    await page.getByLabel('Contraseña actual').fill('no-es-esta');
    await page.getByLabel('Contraseña nueva').fill('claveNueva456');
    await page.getByRole('button', { name: 'Cambiar la contraseña' }).click();

    await expect(notificacion(page)).toContainText('La contraseña actual no es correcta');
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole('button', { name: 'Menú de la cuenta' })).toBeVisible();

    const guardada = api.estado.usuarios.find((usuario) => usuario.id === ANA.id);
    expect(guardada?.contrasena).toBe(ANA.contrasena);
  });

  test('no deja poner una contraseña más corta que el mínimo', async ({ page }) => {
    await abrirComo(page, ANA, '/perfil');

    await page.getByLabel('Contraseña actual').fill(ANA.contrasena);
    await page.getByLabel('Contraseña nueva').fill('corta');
    await page.getByRole('button', { name: 'Cambiar la contraseña' }).click();

    await expect(
      page.getByText('La contraseña tiene que tener al menos 8 caracteres.')
    ).toBeVisible();
  });

  // No es una pantalla de administración: no depende del rol.
  test('el administrador también gestiona su propia cuenta', async ({ page, api }) => {
    await abrirComo(page, ADMINISTRADOR, '/perfil');

    await page.getByLabel('Nombre').fill('Lucía Prieto Salas');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(notificacion(page)).toContainText('Datos actualizados correctamente.');

    const guardado = api.estado.usuarios.find((usuario) => usuario.id === ADMINISTRADOR.id);
    expect(guardado?.nombre).toBe('Lucía Prieto Salas');
    // Y sigue siendo administrador: el perfil no toca el rol.
    expect(guardado?.rolId).toBe(ADMINISTRADOR.rolId);
  });
});
