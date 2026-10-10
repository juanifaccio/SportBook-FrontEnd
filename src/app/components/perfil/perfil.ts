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

const LARGO_MINIMO_CONTRASENA = 8;

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
        this.contrasenaFormulario.reset();
        this.verContrasenas.set(false);
        this.notificacion.exito('Contraseña actualizada correctamente.');
      },
      error: () => this.guardandoContrasena.set(false)
    });
  }

}
