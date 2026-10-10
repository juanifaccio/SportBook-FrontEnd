import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Equipamiento, EquipamientoDto } from '../../../models/equipamiento';

@Component({
  selector: 'app-equipamiento-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './equipamiento-form.html',
  styleUrl: './equipamiento-form.css'
})
export class EquipamientoFormComponent {
  readonly equipamiento = input<Equipamiento | null>(null);

  readonly guardando = input(false);

  readonly guardar = output<EquipamientoDto>();

  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected formulario = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(60)]),
    descripcion: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(255)
    ]),
    precio: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    stock: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)])
  });

  constructor() {
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
