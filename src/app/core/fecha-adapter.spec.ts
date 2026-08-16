import { TestBed } from '@angular/core/testing';
import { MAT_DATE_LOCALE } from '@angular/material/core';

import { FORMATOS_FECHA, FechaAdapter } from './fecha-adapter';

describe('FechaAdapter', () => {
  let adapter: FechaAdapter;

  /** El formato con el que se escribe y se muestra la fecha en el campo. */
  const formatoCampo = FORMATOS_FECHA.display.dateInput;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FechaAdapter, { provide: MAT_DATE_LOCALE, useValue: 'es-AR' }]
    });

    adapter = TestBed.inject(FechaAdapter);
  });

  describe('parse — la fecha escrita por teclado', () => {
    it('interpreta DD/MM/AAAA como día, mes y año, sin ambigüedad', () => {
      const fecha = adapter.parse('08/12/2026')!;

      // Con el adaptador nativo esto queda librado a `Date.parse`, que según el
      // navegador puede leerlo como el 12 de agosto. Acá siempre es el 8 de
      // diciembre.
      expect(fecha.getDate()).toBe(8);
      expect(fecha.getMonth()).toBe(11);
      expect(fecha.getFullYear()).toBe(2026);
    });

    it('acepta un solo dígito en el día y el mes, y el guion como separador', () => {
      expect(adapter.parse('5/1/2026')?.getDate()).toBe(5);
      expect(adapter.parse('20-08-2026')?.getMonth()).toBe(7);
    });

    it('devuelve la fecha a medianoche local', () => {
      const fecha = adapter.parse('20/08/2026')!;

      expect(fecha.getHours()).toBe(0);
      expect(fecha.getMinutes()).toBe(0);
    });

    it('rechaza un día que no existe en vez de correrlo al mes siguiente', () => {
      // `new Date(2026, 1, 31)` no falla: da el 3 de marzo. Eso guardaría una
      // fecha que el usuario nunca escribió.
      expect(adapter.isValid(adapter.parse('31/02/2026')!)).toBe(false);
      expect(adapter.isValid(adapter.parse('31/04/2026')!)).toBe(false);
    });

    it('acepta el 29 de febrero de un año bisiesto', () => {
      expect(adapter.parse('29/02/2024')?.getDate()).toBe(29);
    });

    it('marca como inválido lo que no tiene forma de fecha', () => {
      // Inválido y no `null`: `null` para Material significa "campo vacío", y el
      // usuario recibiría "la fecha es obligatoria" después de escribir algo.
      for (const basura of ['mañana', '20/08', '2026-08-20', '20/08/26']) {
        expect(adapter.isValid(adapter.parse(basura)!)).toBe(false);
      }
    });

    it('trata el campo vacío como "sin fecha", no como un error', () => {
      expect(adapter.parse('')).toBeNull();
      expect(adapter.parse('   ')).toBeNull();
    });
  });

  describe('format — la fecha mostrada en el campo', () => {
    it('muestra DD/MM/AAAA con ceros a la izquierda', () => {
      expect(adapter.format(new Date(2026, 0, 5), formatoCampo)).toBe('05/01/2026');
      expect(adapter.format(new Date(2026, 7, 20), formatoCampo)).toBe('20/08/2026');
    });

    it('lo que se escribe y lo que se muestra son el mismo formato', () => {
      const escrito = '20/08/2026';

      expect(adapter.format(adapter.parse(escrito)!, formatoCampo)).toBe(escrito);
    });
  });

  describe('la hora, que usa el mismo adaptador que la fecha', () => {
    /** El formato con el que se escribe y se muestra la hora en el campo. */
    const formatoHora = FORMATOS_FECHA.display.timeInput;

    it('muestra HH:mm en formato de 24 horas y con cero a la izquierda', () => {
      // Con el formato del locale esto saldría como "9:00", y el mismo turno se
      // vería distinto acá que en las tarjetas y los chips, que imprimen el
      // texto del backend tal cual.
      expect(adapter.format(new Date(2026, 7, 20, 9, 0), formatoHora)).toBe('09:00');
      expect(adapter.format(new Date(2026, 7, 20, 19, 30), formatoHora)).toBe('19:30');
    });

    it('define los tres formatos de hora que el timepicker exige', () => {
      // Si falta uno, el timepicker no monta y lanza "Incomplete
      // MAT_DATE_FORMATS".
      expect(FORMATOS_FECHA.display.timeInput).toBeDefined();
      expect(FORMATOS_FECHA.display.timeOptionLabel).toBeDefined();
      expect(FORMATOS_FECHA.parse.timeInput).toBeDefined();
    });

    it('interpreta la hora escrita a mano sin necesidad de un parse propio', () => {
      // A diferencia de la fecha, una hora escrita no es ambigua, así que el
      // `parseTime` heredado alcanza.
      expect(adapter.parseTime('19:30')?.getHours()).toBe(19);
      expect(adapter.parseTime('9:05')?.getMinutes()).toBe(5);
    });

    it('distingue el campo vacío de la hora que no se entiende', () => {
      // Igual que en la fecha: `null` significa "vacío" y dispara `required`,
      // mientras que una fecha inválida es la que dispara `matTimepickerParse`.
      expect(adapter.parseTime('')).toBeNull();
      expect(adapter.isValid(adapter.parseTime('mediodía')!)).toBe(false);
      expect(adapter.isValid(adapter.parseTime('25:00')!)).toBe(false);
    });
  });

  it('arranca la semana del calendario en lunes', () => {
    expect(adapter.getFirstDayOfWeek()).toBe(1);
  });
});
