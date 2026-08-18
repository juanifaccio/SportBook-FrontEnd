import { AbstractControl, ValidationErrors } from '@angular/forms';

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
