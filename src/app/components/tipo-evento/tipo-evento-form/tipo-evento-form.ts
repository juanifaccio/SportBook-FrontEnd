import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TipoEvento, TipoEventoDto } from '../../../models/tipo-evento';

/**
 * Formulario de alta y edición de un tipo de evento.
 *
 * Es un componente presentacional: no conoce el servicio ni el backend. Recibe
 * el tipo a editar por *input property* y avisa el resultado por *output
 * property*, así que puede reutilizarse desde un diálogo, una página propia o
 * un panel embebido sin cambiarle una línea.
 */
@Component({
  selector: 'app-tipo-evento-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './tipo-evento-form.html',
  styleUrl: './tipo-evento-form.css'
})
export class TipoEventoFormComponent {

  /** Tipo de evento a editar; `null` significa que se está dando de alta uno nuevo. */
  readonly tipoEvento = input<TipoEvento | null>(null);

  /** Deshabilita los controles mientras el request está en curso. */
  readonly guardando = input(false);

  readonly guardar = output<TipoEventoDto>();

  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]]
  });

  constructor() {
    // Cuando cambia el tipo recibido, el formulario se recarga con sus datos.
    effect(() => {
      const tipo = this.tipoEvento();
      this.formulario.reset({
        nombre: tipo?.nombre ?? ''
      });
    });
  }

  protected get esEdicion(): boolean {
    return this.tipoEvento() !== null;
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      // Marca los controles para que se vean los mensajes de error.
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardar.emit(this.formulario.getRawValue());
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
