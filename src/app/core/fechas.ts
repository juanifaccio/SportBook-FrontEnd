/**
 * Utilidades para las fechas y horas que viajan por la API.
 *
 * El backend manda el día como `"AAAA-MM-DD"` y las horas como `"HH:mm"`, dos
 * textos separados y sin huso horario. Todo lo que se haga con ellos tiene que
 * respetar eso: construir un `Date` a partir del día solo lo interpretaría en
 * UTC y mostraría el día anterior.
 */

/**
 * Pasa `"AAAA-MM-DD"` a `"DD/MM/AAAA"`. Reordena el texto en vez de construir un
 * `Date`, justamente para no caer en la interpretación UTC.
 */
export const formatearFecha = (fecha: string): string => fecha.split('-').reverse().join('/');

/**
 * Indica si un turno ya arrancó. Rearma el instante completo a partir del día y
 * la hora, en hora local porque es la del complejo.
 */
export const yaEmpezo = (fecha: string, horaInicio: string): boolean => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [hora, minuto] = horaInicio.split(':').map(Number);

  return new Date(anio, mes - 1, dia, hora, minuto).getTime() <= Date.now();
};

/**
 * Día de hoy como `"AAAA-MM-DD"`. Se arma con las partes locales de la fecha y
 * no con `toISOString()`, que devuelve el día en UTC y a la tarde ya está
 * mostrando el de mañana.
 */
export const hoyLocal = (): string => aTexto(new Date());

/**
 * Pasa un `Date` a `"AAAA-MM-DD"` usando sus partes **locales**.
 *
 * Nunca `toISOString()`: ese devuelve el día en UTC, así que una fecha elegida
 * en el calendario a la tarde saldría como la del día siguiente.
 */
export const aTexto = (fecha: Date): string => {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const dia = `${fecha.getDate()}`.padStart(2, '0');

  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

/**
 * Pasa un `"AAAA-MM-DD"` a `Date`, a medianoche **local**.
 *
 * Nunca `new Date("2026-08-20")`: esa forma la interpreta como medianoche UTC y
 * en Argentina cae el día anterior a las 21:00.
 *
 * Junto con `aTexto` forman el único borde donde la aplicación pasa de texto a
 * `Date`, que es lo que necesita el calendario de Material. Todo lo demás sigue
 * hablando en texto.
 */
export const aDate = (fecha: string): Date | null => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);

  if (!partes) {
    return null;
  }

  const [, anio, mes, dia] = partes.map(Number);

  return new Date(anio, mes - 1, dia);
};

/**
 * Pasa un `Date` a la hora `"HH:mm"` que espera el backend, con cero a la
 * izquierda y en formato de 24 horas.
 *
 * Es el equivalente de `aTexto` para la hora: el timepicker de Material también
 * trabaja con `Date`, y este es el borde donde se vuelve al texto.
 */
export const aHora = (fecha: Date): string => {
  const hora = `${fecha.getHours()}`.padStart(2, '0');
  const minuto = `${fecha.getMinutes()}`.padStart(2, '0');

  return `${hora}:${minuto}`;
};

/**
 * Pasa un `"HH:mm"` al `Date` que necesita el timepicker.
 *
 * El día que se usa es el de **hoy**, y no uno fijo, porque es el mismo que
 * elige `NativeDateAdapter.parseTime` cuando el usuario escribe la hora a mano:
 * así todas las horas del formulario —las que vienen del backend, las escritas
 * y las elegidas de la lista— comparten la parte de fecha y se pueden comparar
 * entre sí. De la fecha nadie lee nada: la del turno es un campo aparte.
 */
export const aDateHora = (hora: string): Date | null => {
  const partes = /^(\d{1,2}):(\d{2})$/.exec(hora);

  if (!partes) {
    return null;
  }

  const [, horas, minutos] = partes.map(Number);

  if (horas > 23 || minutos > 59) {
    return null;
  }

  const fecha = new Date();
  fecha.setHours(horas, minutos, 0, 0);

  return fecha;
};

/** Los minutos transcurridos desde la medianoche hasta una hora `"HH:mm"`. */
const aMinutos = (hora: string): number => {
  const [horas, minutos] = hora.split(':').map(Number);

  return horas * 60 + minutos;
};

/**
 * Cuántos minutos hay entre dos horas `"HH:mm"` del mismo día.
 *
 * Se calcula sobre el texto y no sobre dos `Date`, porque las horas del
 * formulario traen además una parte de fecha que no significa nada: restarlas
 * como instantes daría cualquier cosa si esas fechas no coinciden.
 */
export const minutosEntre = (desde: string, hasta: string): number =>
  aMinutos(hasta) - aMinutos(desde);
