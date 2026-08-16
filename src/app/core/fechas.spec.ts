import { aDate, aTexto, formatearFecha, hoyLocal, yaEmpezo } from './fechas';

describe('utilidades de fecha', () => {
  describe('aDate / aTexto — el borde entre el texto de la API y el calendario', () => {
    it('convierte "AAAA-MM-DD" a un Date local, no a medianoche UTC', () => {
      const fecha = aDate('2026-08-20')!;

      // Si se hubiera usado `new Date('2026-08-20')`, en Argentina (UTC−3) esto
      // daría el 19 a las 21:00. Es el bug que la conversión local evita.
      expect(fecha.getFullYear()).toBe(2026);
      expect(fecha.getMonth()).toBe(7);
      expect(fecha.getDate()).toBe(20);
      expect(fecha.getHours()).toBe(0);
    });

    it('vuelve al mismo texto del que salió', () => {
      for (const texto of ['2026-01-01', '2026-08-20', '2026-12-31']) {
        expect(aTexto(aDate(texto)!)).toBe(texto);
      }
    });

    it('rellena con ceros a la izquierda', () => {
      expect(aTexto(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('devuelve null si el texto no tiene el formato de la API', () => {
      expect(aDate('')).toBeNull();
      expect(aDate('20/08/2026')).toBeNull();
    });

    it('hoyLocal usa el día local y no el de UTC', () => {
      const ahora = new Date();
      const esperado = `${ahora.getFullYear()}-${`${ahora.getMonth() + 1}`.padStart(2, '0')}-${`${ahora.getDate()}`.padStart(2, '0')}`;

      expect(hoyLocal()).toBe(esperado);
    });
  });

  describe('formatearFecha', () => {
    it('muestra el día como DD/MM/AAAA', () => {
      expect(formatearFecha('2026-08-20')).toBe('20/08/2026');
    });
  });

  describe('yaEmpezo', () => {
    it('reconoce un turno pasado y uno futuro', () => {
      expect(yaEmpezo('2020-01-01', '10:00')).toBe(true);
      expect(yaEmpezo('2099-01-01', '10:00')).toBe(false);
    });
  });
});
