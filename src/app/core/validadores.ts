import { AbstractControl, ValidationErrors } from '@angular/forms';

import { aHora } from './fechas';

export const entero = (control: AbstractControl): ValidationErrors | null =>
  control.value === null || control.value === '' || Number.isInteger(control.value)
    ? null
    : { entero: true };

export const posteriorAlInicio = (control: AbstractControl): ValidationErrors | null => {
  const horaInicio: Date | null = control.parent?.get('horaInicio')?.value;
  const horaFin: Date | null = control.value;

  if (!horaInicio || !horaFin) {
    return null;
  }

  if (isNaN(horaInicio.getTime()) || isNaN(horaFin.getTime())) {
    return null;
  }

  return aHora(horaFin) > aHora(horaInicio) ? null : { horasInvertidas: true };
};
