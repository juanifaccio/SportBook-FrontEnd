import { Locator, Page, expect as esperar, test as base } from '@playwright/test';
import { ApiFalsa } from './api-falsa';
import { UsuarioSembrado } from './datos';

export const test = base.extend<{ api: ApiFalsa }>({
  api: [
    async ({ page }, usar) => {
      const api = new ApiFalsa();
      const sinAtrapar: string[] = [];

      page.on('console', (mensaje) => {
        if (mensaje.type() === 'error' && mensaje.text().startsWith('ERROR')) {
          sinAtrapar.push(mensaje.text());
        }
      });

      await api.instalar(page);
      await usar(api);

      esperar(sinAtrapar, 'errores sin atrapar en la consola').toEqual([]);
    },
    { auto: true }
  ]
});

export { expect } from '@playwright/test';

const CLAVE_TOKEN = 'sportbook.token';
const CLAVE_USUARIO = 'sportbook.usuario';

export const sembrarSesion = async (pagina: Page, usuario: UsuarioSembrado): Promise<void> => {
  const { contrasena, ...sinContrasena } = usuario;

  await pagina.addInitScript(
    ([claveToken, claveUsuario, token, guardado]) => {
      localStorage.setItem(claveToken as string, token as string);
      localStorage.setItem(claveUsuario as string, guardado as string);
    },
    [CLAVE_TOKEN, CLAVE_USUARIO, `token-${usuario.id}`, JSON.stringify(sinContrasena)]
  );
};

export const abrirComo = async (
  pagina: Page,
  usuario: UsuarioSembrado,
  ruta: string
): Promise<void> => {
  await sembrarSesion(pagina, usuario);
  await pagina.goto(ruta);
};

export const notificacion = (pagina: Page): Locator => pagina.locator('mat-snack-bar-container');

export const dialogo = (pagina: Page): Locator => pagina.getByRole('dialog');

export const tooltip = (pagina: Page): Locator => pagina.locator('.mat-mdc-tooltip-surface');

export const elegirOpcion = async (
  pagina: Page,
  etiqueta: string,
  opcion: string | RegExp
): Promise<void> => {
  const panel = pagina.locator('.mat-mdc-select-panel');

  await esperar(panel).toHaveCount(0);

  await pagina.getByRole('combobox', { name: etiqueta }).click();
  await panel.getByRole('option', { name: opcion }).click();
};

export const contenedorDe = (raiz: Locator, etiquetaDelBoton: string): Locator =>
  raiz.locator(`span:has(button[aria-label^="${etiquetaDelBoton}"])`);

export const escribirFecha = async (
  raiz: Page | Locator,
  etiqueta: string,
  fecha: string
): Promise<void> => {
  const campo = raiz.getByRole('textbox', { name: etiqueta });

  await campo.fill(diaMesAnio(fecha));
  await campo.blur();
};

export const diaMesAnio = (fecha: string): string => fecha.split('-').reverse().join('/');
