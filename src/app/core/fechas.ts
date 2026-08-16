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
