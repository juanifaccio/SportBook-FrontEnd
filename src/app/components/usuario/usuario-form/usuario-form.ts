import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { Usuario, UsuarioDto } from '../../../models/usuario';
import { Rol, etiquetaRol } from '../../../models/rol';

const LARGO_MINIMO_CONTRASENA = 8;

@Component({
  selector: 'app-usuario-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule
  ],
  templateUrl: './usuario-form.html',
  styleUrl: './usuario-form.css'
})
export class UsuarioFormComponent {
  readonly usuario = input<Usuario | null>(null);

  readonly roles = input<Rol[]>([]);

  readonly guardando = input(false);

  readonly guardar = output<UsuarioDto>();
  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected readonly largoMinimoContrasena = LARGO_MINIMO_CONTRASENA;
  protected readonly etiquetaRol = etiquetaRol;

  protected formulario = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(60)]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    contrasena: this.fb.nonNullable.control(''),
    telefono: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(20)
    ]),
    rolId: this.fb.control<number | null>(null, Validators.required),
    activo: this.fb.nonNullable.control(true)
  });

  constructor() {
    effect(() => {
      const usuario = this.usuario();

      this.formulario.controls.contrasena.setValidators(
        usuario
          ? [Validators.minLength(LARGO_MINIMO_CONTRASENA)]
          : [Validators.required, Validators.minLength(LARGO_MINIMO_CONTRASENA)]
      );

      this.formulario.reset({
        nombre: usuario?.nombre ?? '',
        email: usuario?.email ?? '',
        contrasena: '',
        telefono: usuario?.telefono ?? '',
        rolId: usuario?.rolId ?? null,
        activo: usuario?.activo ?? true
      });
    });
  }

  protected get esEdicion(): boolean {
    return this.usuario() !== null;
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { nombre, email, contrasena, telefono, rolId, activo } =
      this.formulario.getRawValue();

    const dto: UsuarioDto = {
      nombre,
      email,
      telefono,
      rolId: Number(rolId),
      activo
    };

    if (contrasena) {
      dto.contrasena = contrasena;
    }

    this.guardar.emit(dto);
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
