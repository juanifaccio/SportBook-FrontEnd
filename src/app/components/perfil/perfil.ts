import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { etiquetaRol } from '../../models/rol';

/** Largo mínimo que exige el backend. */
const LARGO_MINIMO_CONTRASENA = 8;

/**
 * Mi perfil: los datos de la cuenta de quien está conectado.
 *
 * Sirve a los dos roles por igual —la cuenta propia la gestiona cualquiera— y es
 * lo que evita que un cliente dependa del complejo para corregir un teléfono mal
 * cargado.
 *
 * No es un ABM, así que los requests los hace la pantalla y no un diálogo: no hay
 * listado que actualizar ni nada que se pierda si el guardado falla, porque el
 * formulario queda a la vista con lo que el usuario había escrito.
 *
 * El rol y el estado de la cuenta se muestran pero no se editan: el backend los
 * descarta aunque viajen, y ofrecerlos sugeriría que un cliente puede ascenderse
 * solo.
 */
@Component({
  selector: 'app-perfil',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class PerfilComponent {

  private auth = inject(AuthService);
  private notificacion = inject(NotificacionService);
  private fb = inject(FormBuilder);

  protected readonly usuario = this.auth.usuario;

  protected readonly rol = computed(() => {
    const nombre = this.usuario()?.rol?.nombre;

    return nombre ? etiquetaRol(nombre) : '';
  });

  protected readonly guardandoDatos = signal(false);
  protected readonly guardandoContrasena = signal(false);

  protected readonly verContrasenas = signal(false);

  protected datosFormulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    telefono: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]]
  });

  protected contrasenaFormulario = this.fb.nonNullable.group({
    contrasenaActual: ['', Validators.required],
    contrasenaNueva: [
      '',
      [Validators.required, Validators.minLength(LARGO_MINIMO_CONTRASENA)]
    ]
  });

  constructor() {
    const usuario = this.usuario();

    // El usuario ya está en memoria desde que se inició sesión, así que la
    // pantalla no necesita pedirlo: no hay estado de carga que mostrar.
    this.datosFormulario.reset({
      nombre: usuario?.nombre ?? '',
      email: usuario?.email ?? '',
      telefono: usuario?.telefono ?? ''
    });
  }

  protected get tipoContrasena(): string {
    return this.verContrasenas() ? 'text' : 'password';
  }

  protected alternarContrasenas(): void {
    this.verContrasenas.update((visible) => !visible);
  }

  protected guardarDatos(): void {
    if (this.datosFormulario.invalid) {
      this.datosFormulario.markAllAsTouched();
      return;
    }

    this.guardandoDatos.set(true);

    this.auth.actualizarPerfil(this.datosFormulario.getRawValue()).subscribe({
      next: () => {
        this.guardandoDatos.set(false);
        this.notificacion.exito('Datos actualizados correctamente.');
      },
      // El mensaje de error ya lo mostró el interceptor; el formulario queda
      // como estaba para poder corregir y reintentar.
      error: () => this.guardandoDatos.set(false)
    });
  }

  protected cambiarContrasena(): void {
    if (this.contrasenaFormulario.invalid) {
      this.contrasenaFormulario.markAllAsTouched();
      return;
    }

    this.guardandoContrasena.set(true);

    this.auth.cambiarContrasena(this.contrasenaFormulario.getRawValue()).subscribe({
      next: () => {
        this.guardandoContrasena.set(false);
        // Se vacía: dejar las contraseñas escritas en pantalla después de
        // guardarlas no le sirve a nadie.
        this.contrasenaFormulario.reset();
        this.verContrasenas.set(false);
        this.notificacion.exito('Contraseña actualizada correctamente.');
      },
      error: () => this.guardandoContrasena.set(false)
    });
  }

}
