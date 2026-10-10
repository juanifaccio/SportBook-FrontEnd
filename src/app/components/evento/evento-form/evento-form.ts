import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Evento, EventoDto } from '../../../models/evento';
import { Reserva, etiquetaDeReserva } from '../../../models/reserva';
import { TipoEvento } from '../../../models/tipo-evento';
import { entero } from '../../../core/validadores';

@Component({
  selector: 'app-evento-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './evento-form.html',
  styleUrl: './evento-form.css'
})
export class EventoFormComponent {
  readonly evento = input<Evento | null>(null);

  readonly reservas = input<Reserva[]>([]);

  readonly tipos = input<TipoEvento[]>([]);

  readonly guardando = input(false);

  readonly guardar = output<EventoDto>();

  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected readonly etiquetaDeReserva = etiquetaDeReserva;

  protected formulario = this.fb.group({
    reservaId: this.fb.control<number | null>(null, Validators.required),
    tipoEventoId: this.fb.control<number | null>(null, Validators.required),
    descripcion: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(255)
    ]),
    cantidadPersonas: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      entero
    ])
  });

  constructor() {
    effect(() => {
      const evento = this.evento();

      this.formulario.reset({
        reservaId: evento?.reservaId ?? null,
        tipoEventoId: evento?.tipoEventoId ?? null,
        descripcion: evento?.descripcion ?? '',
        cantidadPersonas: evento?.cantidadPersonas ?? null
      });
    });
  }

  protected get esEdicion(): boolean {
    return this.evento() !== null;
  }

  protected get reservaFija(): string {
    const reserva = this.evento()?.reserva;

    return reserva ? etiquetaDeReserva(reserva) : '';
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { reservaId, tipoEventoId, descripcion, cantidadPersonas } =
      this.formulario.getRawValue();

    this.guardar.emit({
      reservaId: Number(reservaId),
      tipoEventoId: Number(tipoEventoId),
      descripcion,
      cantidadPersonas: Number(cantidadPersonas)
    });
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
