import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { Usuario, UsuarioDto } from '../../../models/usuario';
import { Rol, etiquetaRol } from '../../../models/rol';

/** Mismo mínimo que valida el backend. */
const LARGO_MINIMO_CONTRASENA = 8;

/**
 * Formulario de alta y edición de un usuario.
 *
 * Es un componente presentacional: no conoce el servicio ni el backend. Los
 * roles del selector llegan por `input`, así que tampoco los pide él.
 */
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

  /** Usuario a editar; `null` significa que se está dando de alta uno nuevo. */
  readonly usuario = input<Usuario | null>(null);

  /** Opciones del selector de rol. */
  readonly roles = input<Rol[]>([]);

  /** Deshabilita los controles mientras el request está en curso. */
  readonly guardando = input(false);

  readonly guardar = output<UsuarioDto>();
  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected readonly largoMinimoContrasena = LARGO_MINIMO_CONTRASENA;
  protected readonly etiquetaRol = etiquetaRol;

  protected formulario = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(60)]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    // Los validadores de la contraseña se arman en el `effect`: cambian según se
    // esté dando de alta o editando.
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
    // Cuando cambia el usuario recibido, el formulario se recarga con sus datos.
    effect(() => {
      const usuario = this.usuario();

      // En el alta la contraseña es obligatoria; en la edición se puede dejar en
      // blanco para conservar la guardada, porque el formulario no la tiene: la
      // API nunca la devuelve y por lo tanto no puede reenviarla.
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
      // Marca los controles para que se vean los mensajes de error.
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

    // Sin contraseña nueva el campo ni siquiera viaja: es lo que le indica al
    // backend que tiene que dejar la que ya estaba guardada.
    if (contrasena) {
      dto.contrasena = contrasena;
    }

    this.guardar.emit(dto);
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
