import { Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { map } from 'rxjs';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { AuthService } from '../../core/services/auth.service';
import { etiquetaRol } from '../../models/rol';

interface ItemNavegacion {
  etiqueta: string;
  ruta: string;
  icono: string;
  /** Pantalla de administración del complejo: el cliente no la ve. */
  soloAdmin?: boolean;
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
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent {

  private breakpointObserver = inject(BreakpointObserver);

  private auth = inject(AuthService);

  private sidenav = viewChild.required(MatSidenav);

  protected readonly usuario = this.auth.usuario;

  /** La etiqueta legible del rol, para mostrarla en el menú de la cuenta. */
  protected readonly rol = computed(() => {
    const nombre = this.usuario()?.rol?.nombre;

    return nombre ? etiquetaRol(nombre) : '';
  });

  /** `true` a partir de MD: pantalla suficientemente ancha para el menú fijo. */
  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly modoSidenav = computed(() => (this.esPantallaAncha() ? 'side' : 'over'));

  private readonly items: ItemNavegacion[] = [
    // Reservar va primero: es el caso de uso central de la aplicación, no un ABM más.
    { etiqueta: 'Reservar', ruta: '/reservar', icono: 'event_available' },
    // Y justo después, la contracara: lo ya reservado y qué hacer con ello. El
    // cliente ve acá solamente las suyas; eso lo resuelve el backend.
    { etiqueta: 'Reservas', ruta: '/reservas', icono: 'event_note' },
    // Tampoco es solo del administrador: el evento es de quien es la reserva, y
    // el cliente entra acá a cargar o corregir el de las suyas.
    { etiqueta: 'Eventos', ruta: '/eventos', icono: 'celebration' },
    // Tampoco es solo del administrador: el cliente entra a ver lo que se cobró
    // por sus reservas, aunque no pueda registrar nada.
    { etiqueta: 'Pagos', ruta: '/pagos', icono: 'payments' },
    { etiqueta: 'Canchas', ruta: '/canchas', icono: 'stadium', soloAdmin: true },
    { etiqueta: 'Horarios', ruta: '/horarios', icono: 'schedule', soloAdmin: true },
    { etiqueta: 'Usuarios', ruta: '/usuarios', icono: 'group', soloAdmin: true },
    { etiqueta: 'Tipos de cancha', ruta: '/tipos-cancha', icono: 'category', soloAdmin: true },
    // `label` y no `celebration`: ese ícono pasó a ser el de Eventos, y repetirlo
    // haría que las dos entradas se confundan de un vistazo.
    { etiqueta: 'Tipos de evento', ruta: '/tipos-evento', icono: 'label', soloAdmin: true }
    // A medida que se sumen entidades (Equipamiento, Reservas...) se agregan
    // acá siguiendo este mismo formato.
  ];

  /**
   * Lo que el menú le ofrece a este usuario. Esconder lo que no puede usar es
   * para no hacerle perder el tiempo, no para protegerlo: quien escriba la URL a
   * mano se topa con el `adminGuard` primero y con el backend después.
   */
  protected readonly itemsVisibles = computed(() =>
    this.items.filter((item) => !item.soloAdmin || this.auth.esAdmin())
  );

  /** En pantalla chica el menú se cierra al navegar, para no tapar el contenido. */
  protected alNavegar(): void {
    if (!this.esPantallaAncha()) {
      this.sidenav().close();
    }
  }

  protected alternarMenu(): void {
    this.sidenav().toggle();
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
  }

}
