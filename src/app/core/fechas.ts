export const formatearFecha = (fecha: string): string => fecha.split('-').reverse().join('/');

export const yaEmpezo = (fecha: string, horaInicio: string): boolean => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [hora, minuto] = horaInicio.split(':').map(Number);

  return new Date(anio, mes - 1, dia, hora, minuto).getTime() <= Date.now();
};

export const hoyLocal = (): string => aTexto(new Date());

export const aTexto = (fecha: Date): string => {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const dia = `${fecha.getDate()}`.padStart(2, '0');

  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

export const aDate = (fecha: string): Date | null => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);

  if (!partes) {
    return null;
  }

  const [, anio, mes, dia] = partes.map(Number);

  return new Date(anio, mes - 1, dia);
};

export const aHora = (fecha: Date): string => {
  const hora = `${fecha.getHours()}`.padStart(2, '0');
  const minuto = `${fecha.getMinutes()}`.padStart(2, '0');

  return `${hora}:${minuto}`;
};

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

const aMinutos = (hora: string): number => {
  const [horas, minutos] = hora.split(':').map(Number);

  return horas * 60 + minutos;
};

export const minutosEntre = (desde: string, hasta: string): number =>
  aMinutos(hasta) - aMinutos(desde);
