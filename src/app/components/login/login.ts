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

/** A dónde va el usuario después de entrar, si no venía de ninguna pantalla. */
const DESTINO_POR_DEFECTO = '/reservar';

/**
 * Pantalla de inicio de sesión.
 *
 * Es la única fuera del layout de la aplicación: todavía no hay usuario, así que
 * mostrar el menú lateral con pantallas a las que no se puede entrar sería
 * ofrecer algo que no está.
 */
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

  /** Deshabilita los controles mientras el request está en curso. */
  protected readonly entrando = signal(false);

  /** Oculta o muestra la contraseña escrita. */
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
      // Marca los controles para que se vean los mensajes de error.
      this.formulario.markAllAsTouched();
      return;
    }

    this.entrando.set(true);

    this.auth.iniciarSesion(this.formulario.getRawValue()).subscribe({
      next: (respuesta) => {
        this.notificacion.exito(`Hola, ${respuesta.usuario.nombre}.`);

        // Si el usuario había pedido una pantalla y el guard lo mandó acá, se lo
        // devuelve a donde quería ir.
        const volverA = this.ruta.snapshot.queryParamMap.get('volverA');

        this.router.navigateByUrl(volverA ?? DESTINO_POR_DEFECTO);
      },
      // El motivo ya lo mostró el interceptor de errores; acá solo se devuelve
      // el control para que el usuario corrija y reintente.
      error: () => this.entrando.set(false)
    });
  }

}
