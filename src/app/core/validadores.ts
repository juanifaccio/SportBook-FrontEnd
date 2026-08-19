import { AbstractControl, ValidationErrors } from '@angular/forms';

import { aHora } from './fechas';

/**
 * Validadores propios, para reglas que Angular no trae y que valen en más de un
 * formulario.
 */

/**
 * Exige un número entero.
 *
 * `Validators.min` no alcanza: un `type="number"` acepta decimales igual, y el
 * backend los rechaza donde no tienen sentido (medio invitado no existe). Un
 * control vacío se da por válido: de eso se ocupa `Validators.required`.
 */
export const entero = (control: AbstractControl): ValidationErrors | null =>
  control.value === null || control.value === '' || Number.isInteger(control.value)
    ? null
    : { entero: true };

/**
 * Valida que un turno no termine antes de empezar. Se aplica sobre la hora de
 * fin, que lee la de inicio de su formulario.
 *
 * El error se marca sobre la hora de fin y no sobre el grupo porque Material
 * solo muestra el `mat-error` de un campo cuando ese campo es el inválido: con
 * el error en el grupo, el formulario se negaba a enviarse sin decir por qué.
 */
export const posteriorAlInicio = (control: AbstractControl): ValidationErrors | null => {
  const horaInicio: Date | null = control.parent?.get('horaInicio')?.value;
  const horaFin: Date | null = control.value;

  if (!horaInicio || !horaFin) {
    return null;
  }

  // Con una hora que el usuario escribió mal, el timepicker deja en el control
  // una fecha inválida. De eso ya avisa `matTimepickerParse`: comparar acá solo
  // agregaría un segundo error para el mismo problema.
  if (isNaN(horaInicio.getTime()) || isNaN(horaFin.getTime())) {
    return null;
  }

  // Se comparan como el "HH:mm" que se va a guardar y no como instantes, porque
  // los dos `Date` traen además una fecha que no significa nada acá.
  return aHora(horaFin) > aHora(horaInicio) ? null : { horasInvertidas: true };
};
