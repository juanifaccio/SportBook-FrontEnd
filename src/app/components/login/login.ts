import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';

const DESTINO_POR_DEFECTO = '/reservar';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private ruta = inject(ActivatedRoute);
  private notificacion = inject(NotificacionService);

  protected readonly entrando = signal(false);

  protected readonly verContrasena = signal(false);

  protected formulario = this.fb.group({
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    contrasena: this.fb.nonNullable.control('', Validators.required)
  });

  protected alternarContrasena(): void {
    this.verContrasena.update((visible) => !visible);
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.entrando.set(true);

    this.auth.iniciarSesion(this.formulario.getRawValue()).subscribe({
      next: (respuesta) => {
        this.notificacion.exito(`Hola, ${respuesta.usuario.nombre}.`);

        const volverA = this.ruta.snapshot.queryParamMap.get('volverA');

        this.router.navigateByUrl(volverA ?? DESTINO_POR_DEFECTO);
      },
      error: () => this.entrando.set(false)
    });
  }

}
