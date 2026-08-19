import { Component, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { DURACIONES_TURNO, LoteHorarioDto, etiquetaDuracion } from '../../../models/horario';
import { Cancha } from '../../../models/cancha';
import { aHora, aTexto, minutosEntre } from '../../../core/fechas';
import { posteriorAlInicio } from '../../../core/validadores';

/**
 * Valida que en el rango entre al menos un turno completo.
 *
 * El error se marca sobre la duración y no sobre las horas porque es la que se
 * cambia para arreglarlo: si de 10:00 a 11:00 no entra un turno de 90 minutos,
 * lo natural es bajar la duración, no correr el horario del complejo.
 */
const entraAlMenosUno = (control: AbstractControl): ValidationErrors | null => {
  const duracion: number | null = control.value;
  const horaInicio: Date | null = control.parent?.get('horaInicio')?.value;
  const horaFin: Date | null = control.parent?.get('horaFin')?.value;

  if (!duracion || !horaInicio || !horaFin) {
    return null;
  }

  // Una hora escrita mal deja en el control una fecha inválida, de la que ya
  // avisa `matTimepickerParse`.
  if (isNaN(horaInicio.getTime()) || isNaN(horaFin.getTime())) {
    return null;
  }

  return minutosEntre(aHora(horaInicio), aHora(horaFin)) >= duracion ? null : { rangoCorto: true };
};

/**
 * Formulario de generación de turnos en lote.
 *
 * Es un componente presentacional: no conoce el servicio ni el backend. Las
 * canchas del selector llegan por `input`.
 *
 * No es el formulario de un turno sino el del día entero de una cancha: en vez
 * de una hora de inicio y una de fin se carga el rango en el que abre, y la
 * duración parte ese rango en turnos consecutivos.
 */
@Component({
  selector: 'app-horario-lote-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatTimepickerModule
  ],
  templateUrl: './horario-lote-form.html',
  styleUrl: './horario-lote-form.css'
})
export class HorarioLoteFormComponent {

  /** Opciones del selector de cancha. */
  readonly canchas = input<Cancha[]>([]);

  /** Cancha que viene seleccionada en la pantalla. */
  readonly canchaPorDefecto = input<number | null>(null);

  /** Deshabilita los controles mientras el request está en curso. */
  readonly generando = input(false);

  readonly generar = output<LoteHorarioDto>();
  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected readonly duraciones = DURACIONES_TURNO;
  protected readonly etiquetaDuracion = etiquetaDuracion;

  // Como en el formulario de un turno suelto, la fecha y las horas son `Date`
  // mientras se las edita —es lo que manejan el calendario y el timepicker de
  // Material— y se convierten al texto que espera el backend recién al emitir.
  protected formulario = this.fb.group({
    canchaId: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(null, Validators.required),
    horaInicio: this.fb.control<Date | null>(null, Validators.required),
    horaFin: this.fb.control<Date | null>(null, [Validators.required, posteriorAlInicio]),
    // Una hora es la duración más común de un turno, así que viene propuesta.
    duracion: this.fb.control<number | null>(60, [Validators.required, entraAlMenosUno])
  });

  constructor() {
    // Los tres controles se validan entre sí, así que cambiar uno obliga a
    // revisar los otros: si no, el error queda pegado al valor viejo.
    this.formulario.controls.horaInicio.valueChanges.subscribe(() => {
      this.formulario.controls.horaFin.updateValueAndValidity();
      this.formulario.controls.duracion.updateValueAndValidity();
    });

    this.formulario.controls.horaFin.valueChanges.subscribe(() => {
      this.formulario.controls.duracion.updateValueAndValidity();
    });

    // La cancha de la pantalla es la que se propone, y puede llegar después de
    // que el formulario se haya construido.
    effect(() => {
      this.formulario.controls.canchaId.setValue(this.canchaPorDefecto());
    });
  }

  /**
   * Cuántos turnos va a generar el lote tal como está cargado.
   *
   * Es el mismo cálculo que hace el backend, y acá sirve solo para adelantarlo:
   * cuántos se van a crear de verdad depende de los que ya estén cargados, que
   * esta pantalla no conoce.
   */
  protected get cuantosTurnos(): number | null {
    const { horaInicio, horaFin, duracion } = this.formulario.getRawValue();

    if (!horaInicio || !horaFin || !duracion) {
      return null;
    }

    if (isNaN(horaInicio.getTime()) || isNaN(horaFin.getTime())) {
      return null;
    }

    const minutos = minutosEntre(aHora(horaInicio), aHora(horaFin));

    return minutos < duracion ? null : Math.floor(minutos / duracion);
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      // Marca los controles para que se vean los mensajes de error.
      this.formulario.markAllAsTouched();
      return;
    }

    const { canchaId, fecha, horaInicio, horaFin, duracion } = this.formulario.getRawValue();

    // El validador `required` ya garantiza que están cargados; el chequeo es
    // para que TypeScript lo sepa.
    if (!fecha || !horaInicio || !horaFin) {
      return;
    }

    this.generar.emit({
      fecha: aTexto(fecha),
      horaInicio: aHora(horaInicio),
      horaFin: aHora(horaFin),
      canchaId: Number(canchaId),
      duracion: Number(duracion)
    });
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
