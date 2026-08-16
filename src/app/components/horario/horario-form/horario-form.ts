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
import { Horario, HorarioDto } from '../../../models/horario';
import { Cancha } from '../../../models/cancha';
import { aDate, aTexto } from '../../../core/fechas';

/**
 * Valida que el turno no termine antes de empezar.
 *
 * El error se marca sobre la hora de fin y no sobre el grupo porque Material
 * solo muestra el `mat-error` de un campo cuando ese campo es el inválido: con
 * el error en el grupo, el formulario se negaba a enviarse sin decir por qué.
 */
const posteriorAlInicio = (control: AbstractControl): ValidationErrors | null => {
  const horaInicio = control.parent?.get('horaInicio')?.value;
  const horaFin = control.value;

  if (!horaInicio || !horaFin) {
    return null;
  }

  // Las horas están en formato de 24 horas con dos dígitos, así que compararlas
  // como texto da el mismo orden que compararlas como hora.
  return horaFin > horaInicio ? null : { horasInvertidas: true };
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
    MatDatepickerModule
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

  // La hora es un campo nativo (`type="time"`): su valor ya es el "HH:mm" que
  // espera el backend. La fecha, en cambio, la maneja el calendario de Material
  // como un `Date`, y se convierte a "AAAA-MM-DD" recién al emitir el DTO.
  protected formulario = this.fb.group({
    fecha: this.fb.control<Date | null>(null, Validators.required),
    horaInicio: this.fb.nonNullable.control('', Validators.required),
    horaFin: this.fb.nonNullable.control('', [Validators.required, posteriorAlInicio]),
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
        horaInicio: horario?.horaInicio ?? '',
        horaFin: horario?.horaFin ?? '',
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

    // El validador `required` ya garantiza que hay fecha; el chequeo es para que
    // TypeScript lo sepa.
    if (!fecha) {
      return;
    }

    this.guardar.emit({
      // El calendario devuelve un `Date` y el backend espera "AAAA-MM-DD".
      fecha: aTexto(fecha),
      horaInicio,
      horaFin,
      canchaId: Number(canchaId),
      disponible
    });
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
