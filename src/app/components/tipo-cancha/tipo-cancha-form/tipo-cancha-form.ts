import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TipoCancha, TipoCanchaDto } from '../../../models/tipo-cancha';

@Component({
  selector: 'app-tipo-cancha-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './tipo-cancha-form.html',
  styleUrl: './tipo-cancha-form.css'
})
export class TipoCanchaFormComponent {
  readonly tipoCancha = input<TipoCancha | null>(null);

  readonly guardando = input(false);

  readonly guardar = output<TipoCanchaDto>();

  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]],
    descripcion: ['', [Validators.required, Validators.maxLength(255)]]
  });

  constructor() {
    effect(() => {
      const tipo = this.tipoCancha();
      this.formulario.reset({
        nombre: tipo?.nombre ?? '',
        descripcion: tipo?.descripcion ?? ''
      });
    });
  }

  protected get esEdicion(): boolean {
    return this.tipoCancha() !== null;
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardar.emit(this.formulario.getRawValue());
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
