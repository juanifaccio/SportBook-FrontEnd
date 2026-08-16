import { Injectable, Provider } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_LOCALE,
  MatDateFormats,
  NativeDateAdapter,
  provideNativeDateAdapter
} from '@angular/material/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { aHora, aTexto, formatearFecha } from './fechas';

/** Marca del formato con el que se escribe y se muestra la fecha en el campo. */
const FORMATO_CAMPO = 'DD/MM/AAAA';

/** Marca del formato con el que se muestra la hora, en el campo y en la lista. */
const FORMATO_HORA = 'HH:mm';

/** Día escrito a mano: acepta `20/8/2026`, `20-08-2026`, `5/12/2026`. */
const FECHA_ESCRITA = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

/**
 * Formatos que usan el calendario y el timepicker. Los del campo son nuestros,
 * para que la fecha se escriba y se lea siempre como `DD/MM/AAAA` y la hora
 * siempre como `HH:mm`; los del encabezado y los de accesibilidad los resuelve
 * el adaptador nativo con el locale.
 *
 * Los tres formatos de hora son obligatorios: el timepicker verifica al
 * arrancar que estén los tres y, si falta uno, no monta.
 */
export const FORMATOS_FECHA: MatDateFormats = {
  parse: {
    dateInput: FORMATO_CAMPO,
    // El adaptador nativo no usa este formato para interpretar la hora escrita:
    // le alcanza con reconocer `19:00` o `9:30`. Va en `null` como en los
    // formatos de fábrica de Material.
    timeInput: null
  },
  display: {
    dateInput: FORMATO_CAMPO,
    timeInput: FORMATO_HORA,
    timeOptionLabel: FORMATO_HORA,
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' }
  }
};

/**
 * Adaptador de fechas del calendario de Material.
 *
 * Existe por una razón concreta: **el adaptador nativo interpreta lo que se
 * escribe a mano con `Date.parse`**, que ante un `"08/12/2026"` no sabe si es el
 * 8 de diciembre o el 12 de agosto —depende del navegador—. Como la cátedra pide
 * que la fecha también se pueda ingresar por teclado, esa ambigüedad no es
 * aceptable: acá el formato es explícitamente día/mes/año.
 *
 * Es además el lugar donde la aplicación pasa de su texto `"AAAA-MM-DD"` al
 * `Date` que el calendario necesita, siempre en hora local (ver `fechas.ts`).
 *
 * El timepicker de Material usa este mismo adaptador, pero **no necesita un
 * `parseTime` propio**: una hora escrita no tiene la ambigüedad que tiene una
 * fecha, así que el `parseTime` heredado alcanza. Reconoce `19:00` y `9:30`,
 * valida los rangos, devuelve `null` con el campo vacío y una fecha inválida
 * cuando no entiende lo escrito — que es exactamente el contrato que el `parse`
 * de acá abajo tuvo que construir a mano para la fecha.
 */
@Injectable()
export class FechaAdapter extends NativeDateAdapter {

  /** En Argentina la semana del calendario arranca el lunes. */
  override getFirstDayOfWeek(): number {
    return 1;
  }

  /**
   * Interpreta lo que el usuario escribió.
   *
   * La distinción entre los dos "no hay fecha" es la parte delicada, y es la que
   * decide qué error ve el usuario:
   *
   * - **campo vacío → `null`**, que para Material significa "sin fecha". Si el
   *   control es obligatorio, salta `required`.
   * - **texto que no se entiende → una fecha inválida**, que es lo que hace
   *   saltar `matDatepickerParse`. Devolver `null` acá sería decirle a Material
   *   que el campo está vacío, y el usuario recibiría "la fecha es obligatoria"
   *   después de haber escrito algo.
   */
  override parse(valor: unknown): Date | null {
    if (typeof valor !== 'string') {
      return super.parse(valor);
    }

    const escrito = valor.trim();

    if (!escrito) {
      return null;
    }

    const partes = FECHA_ESCRITA.exec(escrito);

    if (!partes) {
      return new Date(NaN);
    }

    const [, dia, mes, anio] = partes.map(Number);
    const fecha = new Date(anio, mes - 1, dia);

    // Un "31/02/2026" no falla al construirse: `Date` lo corre al 3 de marzo. La
    // única forma de detectarlo es comprobar que el día y el mes sobrevivieron.
    if (fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
      return new Date(NaN);
    }

    return fecha;
  }

  /**
   * Muestra la fecha como `DD/MM/AAAA` y la hora como `HH:mm`, las dos con
   * ceros a la izquierda.
   *
   * La hora se formatea acá en vez de dejársela a `Intl` para que el campo y la
   * lista del timepicker muestren exactamente el mismo texto que las tarjetas de
   * turnos y los chips de `/reservar`, que imprimen el `"HH:mm"` del backend tal
   * cual. Con el formato del locale, un turno de las nueve se vería como `9:00`
   * en un lado y `09:00` en el otro.
   */
  override format(fecha: Date, formato: unknown): string {
    if (formato === FORMATO_CAMPO) {
      return formatearFecha(aTexto(fecha));
    }

    if (formato === FORMATO_HORA) {
      return aHora(fecha);
    }

    return super.format(fecha, formato as object);
  }

}

/**
 * Textos del calendario que Material expone a los lectores de pantalla.
 *
 * Vienen en inglés de fábrica ("Open calendar", "Previous month"), y son lo
 * único de la aplicación que un usuario ciego escucharía en otro idioma. Los
 * días y los meses no hace falta traducirlos: esos salen del locale `es-AR`.
 */
@Injectable()
export class TextosCalendario extends MatDatepickerIntl {
  override calendarLabel = 'Calendario';
  override openCalendarLabel = 'Abrir el calendario';
  override closeCalendarLabel = 'Cerrar el calendario';
  override prevMonthLabel = 'Mes anterior';
  override nextMonthLabel = 'Mes siguiente';
  override prevYearLabel = 'Año anterior';
  override nextYearLabel = 'Año siguiente';
  override prevMultiYearLabel = 'Los 24 años anteriores';
  override nextMultiYearLabel = 'Los 24 años siguientes';
  override switchToMonthViewLabel = 'Elegir una fecha';
  override switchToMultiYearViewLabel = 'Elegir mes y año';
}

/**
 * Todo lo que el calendario necesita para funcionar. Se registra una vez en
 * `app.config.ts` y se reusa en los tests de los componentes que muestran un
 * calendario: así no hay dos listas de proveedores que se puedan desincronizar.
 *
 * Se usa el adaptador nativo, sin sumar dependencias como moment o luxon, con
 * el `FechaAdapter` encima.
 */
export const PROVEEDORES_FECHA: Provider[] = [
  provideNativeDateAdapter(FORMATOS_FECHA),
  { provide: DateAdapter, useClass: FechaAdapter },
  { provide: MAT_DATE_LOCALE, useValue: 'es-AR' },
  { provide: MatDatepickerIntl, useClass: TextosCalendario }
];
