import { Locator, Page, test as base } from '@playwright/test';
import { ApiFalsa } from './api-falsa';
import { UsuarioSembrado } from './datos';

/**
 * Lo que cada test recibe armado: la API falsa ya enganchada a la página.
 *
 * Se crea una por test —con su propia copia de los datos— para que puedan correr
 * en paralelo sin verse entre sí.
 *
 * Va como `auto`: sin eso Playwright solo armaría el accesorio en los tests que
 * lo nombran, y a los que piden únicamente `page` la aplicación les quedaría
 * hablándole al servidor de desarrollo, que a todo lo que no sea un GET le
 * contesta un 404 en HTML.
 */
export const test = base.extend<{ api: ApiFalsa }>({
  api: [
    async ({ page }, usar) => {
      const api = new ApiFalsa();

      await api.instalar(page);
      await usar(api);
    },
    { auto: true }
  ]
});

export { expect } from '@playwright/test';

/**
 * Claves con las que la sesión sobrevive a recargar la página. Son las mismas
 * que exporta `core/services/auth.service.ts`; van repetidas acá y no importadas
 * para no arrastrar Angular al proceso de Playwright.
 */
const CLAVE_TOKEN = 'sportbook.token';
const CLAVE_USUARIO = 'sportbook.usuario';

/**
 * Deja una sesión armada antes de que la aplicación arranque.
 *
 * El login tiene su propio archivo de tests, donde se recorre el formulario de
 * verdad. Al resto de las pantallas se llega ya conectado: repetir el login en
 * cada test no probaría nada nuevo y agregaría un motivo más por el que podrían
 * fallar.
 *
 * Hay que llamarla **antes** de navegar: la sesión se escribe con un script de
 * inicialización, así ya está cuando el `AuthService` la lee al construirse.
 */
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

/** Entra a una pantalla ya conectado con ese usuario. */
export const abrirComo = async (
  pagina: Page,
  usuario: UsuarioSembrado,
  ruta: string
): Promise<void> => {
  await sembrarSesion(pagina, usuario);
  await pagina.goto(ruta);
};

/** El snackbar con el que la aplicación avisa lo que pasó. */
export const notificacion = (pagina: Page): Locator => pagina.locator('mat-snack-bar-container');

/** El diálogo abierto: un formulario, una confirmación o un detalle. */
export const dialogo = (pagina: Page): Locator => pagina.getByRole('dialog');

/**
 * El tooltip visible. Se busca por su clase y no por el rol `tooltip`: Material
 * lo marca `aria-hidden` y expone el texto por `aria-describedby`, así que el
 * elemento que se ve en pantalla no tiene rol.
 */
export const tooltip = (pagina: Page): Locator => pagina.locator('.mat-mdc-tooltip-surface');

/**
 * Elige una opción de un `mat-select`, que no es un `<select>` nativo: hay que
 * abrirlo y clickear la opción del panel que despliega.
 */
export const elegirOpcion = async (
  pagina: Page,
  etiqueta: string,
  opcion: string | RegExp
): Promise<void> => {
  await pagina.getByRole('combobox', { name: etiqueta }).click();
  await pagina.getByRole('option', { name: opcion }).click();
};

/**
 * El contenedor sobre el que se apoya el tooltip de una acción deshabilitada.
 *
 * El tooltip va en un `span` que envuelve al botón, y no en el botón: uno
 * deshabilitado no dispara eventos de mouse, así que el motivo nunca se vería.
 * Para leerlo hay que pasar el mouse por el `span`.
 */
export const contenedorDe = (raiz: Locator, etiquetaDelBoton: string): Locator =>
  raiz.locator(`span:has(button[aria-label^="${etiquetaDelBoton}"])`);

/**
 * Escribe una fecha en un campo con calendario. Se ingresa por teclado como
 * DD/MM/AAAA, que es lo que entiende el adaptador de `core/fecha-adapter.ts`.
 *
 * La raíz puede ser la página o un diálogo: reprogramar tiene su propio campo
 * "Día" abierto encima del de los filtros, y sin acotar el ámbito habría dos.
 */
export const escribirFecha = async (
  raiz: Page | Locator,
  etiqueta: string,
  fecha: string
): Promise<void> => {
  const campo = raiz.getByRole('textbox', { name: etiqueta });

  await campo.fill(diaMesAnio(fecha));
  await campo.blur();
};

/** Pasa un `"AAAA-MM-DD"` al `"DD/MM/AAAA"` que se escribe en pantalla. */
export const diaMesAnio = (fecha: string): string => fecha.split('-').reverse().join('/');
