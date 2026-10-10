import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { posteriorAlInicio } from '../../../core/validadores';

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
  readonly horario = input<Horario | null>(null);

  readonly canchas = input<Cancha[]>([]);

  readonly canchaPorDefecto = input<number | null>(null);

  readonly guardando = input(false);

  readonly guardar = output<HorarioDto>();
  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected formulario = this.fb.group({
    fecha: this.fb.control<Date | null>(null, Validators.required),
    horaInicio: this.fb.control<Date | null>(null, Validators.required),
    horaFin: this.fb.control<Date | null>(null, [Validators.required, posteriorAlInicio]),
    canchaId: this.fb.control<number | null>(null, Validators.required),
    disponible: this.fb.nonNullable.control(true)
  });

  constructor() {
    this.formulario.controls.horaInicio.valueChanges.subscribe(() => {
      this.formulario.controls.horaFin.updateValueAndValidity();
    });

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
      this.formulario.markAllAsTouched();
      return;
    }

    const { fecha, horaInicio, horaFin, canchaId, disponible } = this.formulario.getRawValue();

    if (!fecha || !horaInicio || !horaFin) {
      return;
    }

    this.guardar.emit({
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
