import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

/**
 * Raíz de la aplicación. Solo hospeda al router: el shell con la barra y el menú
 * es `LayoutComponent`, que ahora es una ruta más, para que el login pueda
 * quedar fuera de él.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('SportBook');

  constructor() {
    // La sesión guardada en el navegador puede haber quedado vieja: el token
    // pudo vencer, o al usuario pudieron cambiarle el rol o darlo de baja. Se la
    // revalida contra el backend al arrancar, sin bloquear el primer render:
    // hasta que conteste vale la copia guardada, y si ya no sirve el interceptor
    // cierra la sesión.
    inject(AuthService).restaurar();
  }
}
