import { Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { map } from 'rxjs';
import { BREAKPOINT_MD } from '../../core/breakpoints';

interface ItemNavegacion {
  etiqueta: string;
  ruta: string;
  icono: string;
}

/**
 * Shell de la aplicación: barra superior, navegación lateral y el área donde el
 * router renderiza cada pantalla.
 *
 * Mobile-first: por defecto el menú lateral se superpone al contenido y arranca
 * cerrado; a partir de MD queda fijo al costado y siempre abierto.
 */
@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent {

  private breakpointObserver = inject(BreakpointObserver);

  private sidenav = viewChild.required(MatSidenav);

  /** `true` a partir de MD: pantalla suficientemente ancha para el menú fijo. */
  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly modoSidenav = computed(() => (this.esPantallaAncha() ? 'side' : 'over'));

  protected readonly items: ItemNavegacion[] = [
    { etiqueta: 'Canchas', ruta: '/canchas', icono: 'stadium' },
    { etiqueta: 'Horarios', ruta: '/horarios', icono: 'schedule' },
    { etiqueta: 'Tipos de cancha', ruta: '/tipos-cancha', icono: 'category' },
    { etiqueta: 'Tipos de evento', ruta: '/tipos-evento', icono: 'celebration' }
    // A medida que se sumen entidades (Equipamiento, Reservas...) se agregan
    // acá siguiendo este mismo formato.
  ];

  /** En pantalla chica el menú se cierra al navegar, para no tapar el contenido. */
  protected alNavegar(): void {
    if (!this.esPantallaAncha()) {
      this.sidenav().close();
    }
  }

  protected alternarMenu(): void {
    this.sidenav().toggle();
  }

}
