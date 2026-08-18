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

/**
 * Formulario de alta y edición de un evento.
 *
 * Es un componente presentacional: no conoce el servicio ni el backend. Las
 * reservas y los tipos de los selectores llegan por `input`, así que tampoco los
 * pide él.
 */
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

  /** Evento a editar; `null` significa que se está dando de alta uno nuevo. */
  readonly evento = input<Evento | null>(null);

  /**
   * Opciones del selector de reserva. Solo se usan en el alta: al editar, la
   * reserva es un dato fijo.
   */
  readonly reservas = input<Reserva[]>([]);

  /** Opciones del selector de tipo de evento. */
  readonly tipos = input<TipoEvento[]>([]);

  /** Deshabilita los controles mientras el request está en curso. */
  readonly guardando = input(false);

  readonly guardar = output<EventoDto>();

  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected readonly etiquetaDeReserva = etiquetaDeReserva;

  // La cantidad y los dos ids arrancan en `null` y no en cero: `required` da por
  // válido un 0, así que un control numérico vacío tiene que ser nulo para que
  // el campo se marque como obligatorio.
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
    // Cuando cambia el evento recibido, el formulario se recarga con sus datos.
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

  /**
   * Cómo se muestra la reserva cuando no se la puede cambiar. Al editar viene
   * incluida en el evento, así que no hace falta buscarla entre las opciones.
   */
  protected get reservaFija(): string {
    const reserva = this.evento()?.reserva;

    return reserva ? etiquetaDeReserva(reserva) : '';
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      // Marca los controles para que se vean los mensajes de error.
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
