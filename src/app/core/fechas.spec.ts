import {
  aDate,
  aDateHora,
  aHora,
  aTexto,
  formatearFecha,
  hoyLocal,
  minutosEntre,
  yaEmpezo
} from './fechas';

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

  describe('aDateHora / aHora — el borde entre el texto de la API y el timepicker', () => {
    it('vuelve al mismo texto del que salió', () => {
      for (const texto of ['00:00', '09:05', '13:30', '23:59']) {
        expect(aHora(aDateHora(texto)!)).toBe(texto);
      }
    });

    it('rellena con ceros a la izquierda', () => {
      // El backend guarda las horas como texto y las ordena como texto, así que
      // un "9:05" sin cero rompería el orden del listado.
      expect(aHora(new Date(2026, 7, 20, 9, 5))).toBe('09:05');
    });

    it('acepta un solo dígito en la hora, que es lo que se escribe a mano', () => {
      expect(aHora(aDateHora('9:30')!)).toBe('09:30');
    });

    it('ignora el día: solo importan la hora y los minutos', () => {
      const hora = aDateHora('13:30')!;

      expect(hora.getHours()).toBe(13);
      expect(hora.getMinutes()).toBe(30);
      expect(hora.getSeconds()).toBe(0);
    });

    it('devuelve null si el texto no es una hora válida', () => {
      for (const basura of ['', '25:00', '10:75', '1030', '10:00:00', 'mediodía']) {
        expect(aDateHora(basura)).toBeNull();
      }
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

  describe('minutosEntre', () => {
    it('mide un rango en minutos', () => {
      expect(minutosEntre('08:00', '12:00')).toBe(240);
      expect(minutosEntre('08:15', '09:00')).toBe(45);
    });

    it('cuenta cero cuando las dos horas son la misma', () => {
      expect(minutosEntre('10:00', '10:00')).toBe(0);
    });

    // Es lo que permite usarlo para validar: un rango invertido da negativo y
    // así no llega a parecer un rango corto pero válido.
    it('da negativo cuando el rango está invertido', () => {
      expect(minutosEntre('12:00', '08:00')).toBe(-240);
    });
  });
});
