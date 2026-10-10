import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TipoEvento, TipoEventoDto } from '../../../models/tipo-evento';

@Component({
  selector: 'app-tipo-evento-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './tipo-evento-form.html',
  styleUrl: './tipo-evento-form.css'
})
export class TipoEventoFormComponent {
  readonly tipoEvento = input<TipoEvento | null>(null);

  readonly guardando = input(false);

  readonly guardar = output<TipoEventoDto>();

  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]]
  });

  constructor() {
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
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardar.emit(this.formulario.getRawValue());
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
