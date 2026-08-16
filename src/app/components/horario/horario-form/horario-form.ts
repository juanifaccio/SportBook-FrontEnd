import { Component, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { Horario, HorarioDto } from '../../../models/horario';
import { Cancha } from '../../../models/cancha';
import { aDate, aDateHora, aHora, aTexto } from '../../../core/fechas';

/**
 * Valida que el turno no termine antes de empezar.
 *
 * El error se marca sobre la hora de fin y no sobre el grupo porque Material
 * solo muestra el `mat-error` de un campo cuando ese campo es el inválido: con
 * el error en el grupo, el formulario se negaba a enviarse sin decir por qué.
 */
const posteriorAlInicio = (control: AbstractControl): ValidationErrors | null => {
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

/**
 * Formulario de alta y edición de un turno.
 *
 * Es un componente presentacional: no conoce el servicio ni el backend. Las
 * canchas del selector llegan por `input`.
 */
@Component({
  selector: 'app-horario-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatDatepickerModule,
    MatTimepickerModule
  ],
  templateUrl: './horario-form.html',
  styleUrl: './horario-form.css'
})
export class HorarioFormComponent {

  /** Turno a editar; `null` significa que se está dando de alta uno nuevo. */
  readonly horario = input<Horario | null>(null);

  /** Opciones del selector de cancha. */
  readonly canchas = input<Cancha[]>([]);

  /** Cancha que viene seleccionada en la pantalla, para las altas. */
  readonly canchaPorDefecto = input<number | null>(null);

  /** Deshabilita los controles mientras el request está en curso. */
  readonly guardando = input(false);

  readonly guardar = output<HorarioDto>();
  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  // El calendario y el timepicker de Material trabajan con objetos `Date`, así
  // que los tres campos de tiempo son `Date` mientras se los edita y se
  // convierten al texto que espera el backend —"AAAA-MM-DD" y "HH:mm"— recién al
  // emitir el DTO. Las conversiones viven en `core/fechas.ts`.
  protected formulario = this.fb.group({
    fecha: this.fb.control<Date | null>(null, Validators.required),
    horaInicio: this.fb.control<Date | null>(null, Validators.required),
    horaFin: this.fb.control<Date | null>(null, [Validators.required, posteriorAlInicio]),
    canchaId: this.fb.control<number | null>(null, Validators.required),
    disponible: this.fb.nonNullable.control(true)
  });

  constructor() {
    // La hora de fin se valida contra la de inicio, así que cuando esa cambia
    // hay que volver a validarla: si no, el error queda pegado al valor viejo.
    this.formulario.controls.horaInicio.valueChanges.subscribe(() => {
      this.formulario.controls.horaFin.updateValueAndValidity();
    });

    // Cuando cambia el turno recibido, el formulario se recarga con sus datos.
    effect(() => {
      const horario = this.horario();

      this.formulario.reset({
        fecha: horario ? aDate(horario.fecha) : null,
        horaInicio: horario ? aDateHora(horario.horaInicio) : null,
        horaFin: horario ? aDateHora(horario.horaFin) : null,
        canchaId: horario?.canchaId ?? this.canchaPorDefecto(),
        disponible: horario?.disponible ?? true
      });
    });
  }

  protected get esEdicion(): boolean {
    return this.horario() !== null;
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      // Marca los controles para que se vean los mensajes de error.
      this.formulario.markAllAsTouched();
      return;
    }

    const { fecha, horaInicio, horaFin, canchaId, disponible } = this.formulario.getRawValue();

    // El validador `required` ya garantiza que los tres están cargados; el
    // chequeo es para que TypeScript lo sepa.
    if (!fecha || !horaInicio || !horaFin) {
      return;
    }

    this.guardar.emit({
      // El calendario y el timepicker devuelven `Date`, y el backend espera
      // "AAAA-MM-DD" y "HH:mm".
      fecha: aTexto(fecha),
      horaInicio: aHora(horaInicio),
      horaFin: aHora(horaFin),
      canchaId: Number(canchaId),
      disponible
    });
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
