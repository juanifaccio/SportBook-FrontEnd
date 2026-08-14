import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Cancha, CanchaDto, ESTADOS_CANCHA, ETIQUETAS_ESTADO } from '../../../models/cancha';
import { TipoCancha } from '../../../models/tipo-cancha';

/**
 * Formulario de alta y edición de una cancha.
 *
 * Es un componente presentacional: no conoce el servicio ni el backend. Los
 * tipos de cancha del selector llegan por `input`, así que tampoco los pide él.
 */
@Component({
  selector: 'app-cancha-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './cancha-form.html',
  styleUrl: './cancha-form.css'
})
export class CanchaFormComponent {

  /** Cancha a editar; `null` significa que se está dando de alta una nueva. */
  readonly cancha = input<Cancha | null>(null);

  /** Opciones del selector de tipo de cancha. */
  readonly tipos = input<TipoCancha[]>([]);

  /** Deshabilita los controles mientras el request está en curso. */
  readonly guardando = input(false);

  readonly guardar = output<CanchaDto>();
  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected readonly estados = ESTADOS_CANCHA;
  protected readonly etiquetasEstado = ETIQUETAS_ESTADO;

  // El precio y el tipo arrancan en `null` y no en cero: `Validators.required`
  // da por válido un 0, así que un control numérico vacío tiene que ser nulo
  // para que el campo se marque como obligatorio.
  protected formulario = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(60)]),
    precioPorHora: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1)
    ]),
    estado: this.fb.nonNullable.control<'DISPONIBLE' | 'MANTENIMIENTO'>(
      'DISPONIBLE',
      Validators.required
    ),
    tipoCanchaId: this.fb.control<number | null>(null, Validators.required)
  });

  constructor() {
    // Cuando cambia la cancha recibida, el formulario se recarga con sus datos.
    effect(() => {
      const cancha = this.cancha();

      this.formulario.reset({
        nombre: cancha?.nombre ?? '',
        precioPorHora: cancha?.precioPorHora ?? null,
        estado: cancha?.estado ?? 'DISPONIBLE',
        tipoCanchaId: cancha?.tipoCanchaId ?? null
      });
    });
  }

  protected get esEdicion(): boolean {
    return this.cancha() !== null;
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      // Marca los controles para que se vean los mensajes de error.
      this.formulario.markAllAsTouched();
      return;
    }

    const { nombre, precioPorHora, estado, tipoCanchaId } = this.formulario.getRawValue();

    this.guardar.emit({
      nombre,
      precioPorHora: Number(precioPorHora),
      estado,
      tipoCanchaId: Number(tipoCanchaId)
    });
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
