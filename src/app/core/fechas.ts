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
export const hoyLocal = (): string => {
  const ahora = new Date();
  const mes = `${ahora.getMonth() + 1}`.padStart(2, '0');
  const dia = `${ahora.getDate()}`.padStart(2, '0');

  return `${ahora.getFullYear()}-${mes}-${dia}`;
};
