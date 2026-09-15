import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Equipamiento, EquipamientoDto } from '../../../models/equipamiento';

/**
 * Formulario de alta y edición de un equipamiento.
 *
 * Es un componente presentacional: no conoce el servicio ni el backend. Recibe
 * el equipamiento a editar por *input property* y avisa el resultado por *output
 * property*, así que puede reutilizarse desde un diálogo, una página propia o un
 * panel embebido sin cambiarle una línea.
 */
@Component({
  selector: 'app-equipamiento-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './equipamiento-form.html',
  styleUrl: './equipamiento-form.css'
})
export class EquipamientoFormComponent {

  /** Equipamiento a editar; `null` significa que se está dando de alta uno nuevo. */
  readonly equipamiento = input<Equipamiento | null>(null);

  /** Deshabilita los controles mientras el request está en curso. */
  readonly guardando = input(false);

  readonly guardar = output<EquipamientoDto>();

  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  // El precio y el stock arrancan en `null` y no en cero, como en el formulario
  // de cancha: `Validators.required` da por válido un 0, así que un control
  // numérico vacío tiene que ser nulo para que el campo se marque obligatorio.
  // En el stock eso importa todavía más, porque ahí el cero es un valor real
  // —agotado, pero en catálogo— y no la ausencia de dato.
  protected formulario = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(60)]),
    descripcion: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(255)
    ]),
    // `min(0.01)` y no `min(1)`: el backend solo exige que sea mayor a cero, y
    // hay artículos que se alquilan por centavos de la unidad de cuenta.
    precio: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    stock: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)])
  });

  constructor() {
    // Cuando cambia el equipamiento recibido, el formulario se recarga con sus
    // datos.
    effect(() => {
      const equipamiento = this.equipamiento();

      this.formulario.reset({
        nombre: equipamiento?.nombre ?? '',
        descripcion: equipamiento?.descripcion ?? '',
        precio: equipamiento?.precio ?? null,
        stock: equipamiento?.stock ?? null
      });
    });
  }

  protected get esEdicion(): boolean {
    return this.equipamiento() !== null;
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      // Marca los controles para que se vean los mensajes de error.
      this.formulario.markAllAsTouched();
      return;
    }

    const { nombre, descripcion, precio, stock } = this.formulario.getRawValue();

    this.guardar.emit({
      nombre,
      descripcion,
      precio: Number(precio),
      stock: Number(stock)
    });
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
