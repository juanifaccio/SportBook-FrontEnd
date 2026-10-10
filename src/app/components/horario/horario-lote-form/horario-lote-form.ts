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

const entraAlMenosUno = (control: AbstractControl): ValidationErrors | null => {
  const duracion: number | null = control.value;
  const horaInicio: Date | null = control.parent?.get('horaInicio')?.value;
  const horaFin: Date | null = control.parent?.get('horaFin')?.value;

  if (!duracion || !horaInicio || !horaFin) {
    return null;
  }

  if (isNaN(horaInicio.getTime()) || isNaN(horaFin.getTime())) {
    return null;
  }

  return minutosEntre(aHora(horaInicio), aHora(horaFin)) >= duracion ? null : { rangoCorto: true };
};

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
  readonly canchas = input<Cancha[]>([]);

  readonly canchaPorDefecto = input<number | null>(null);

  readonly generando = input(false);

  readonly generar = output<LoteHorarioDto>();
  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected readonly duraciones = DURACIONES_TURNO;
  protected readonly etiquetaDuracion = etiquetaDuracion;

  protected formulario = this.fb.group({
    canchaId: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(null, Validators.required),
    horaInicio: this.fb.control<Date | null>(null, Validators.required),
    horaFin: this.fb.control<Date | null>(null, [Validators.required, posteriorAlInicio]),
    duracion: this.fb.control<number | null>(60, [Validators.required, entraAlMenosUno])
  });

  constructor() {
    this.formulario.controls.horaInicio.valueChanges.subscribe(() => {
      this.formulario.controls.horaFin.updateValueAndValidity();
      this.formulario.controls.duracion.updateValueAndValidity();
    });

    this.formulario.controls.horaFin.valueChanges.subscribe(() => {
      this.formulario.controls.duracion.updateValueAndValidity();
    });

    effect(() => {
      this.formulario.controls.canchaId.setValue(this.canchaPorDefecto());
    });
  }

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
      this.formulario.markAllAsTouched();
      return;
    }

    const { canchaId, fecha, horaInicio, horaFin, duracion } = this.formulario.getRawValue();

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
