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

const FORMATO_CAMPO = 'DD/MM/AAAA';

const FORMATO_HORA = 'HH:mm';

const FECHA_ESCRITA = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

export const FORMATOS_FECHA: MatDateFormats = {
  parse: {
    dateInput: FORMATO_CAMPO,
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

@Injectable()
export class FechaAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }

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

    if (fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
      return new Date(NaN);
    }

    return fecha;
  }

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

export const PROVEEDORES_FECHA: Provider[] = [
  provideNativeDateAdapter(FORMATOS_FECHA),
  { provide: DateAdapter, useClass: FechaAdapter },
  { provide: MAT_DATE_LOCALE, useValue: 'es-AR' },
  { provide: MatDatepickerIntl, useClass: TextosCalendario }
];
