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
  soloAdmin?: boolean;
}

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

  protected readonly rol = computed(() => {
    const nombre = this.usuario()?.rol?.nombre;

    return nombre ? etiquetaRol(nombre) : '';
  });

  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly modoSidenav = computed(() => (this.esPantallaAncha() ? 'side' : 'over'));

  private readonly items: ItemNavegacion[] = [
    { etiqueta: 'Reservar', ruta: '/reservar', icono: 'event_available' },
    { etiqueta: 'Reservas', ruta: '/reservas', icono: 'event_note' },
    { etiqueta: 'Eventos', ruta: '/eventos', icono: 'celebration' },
    { etiqueta: 'Pagos', ruta: '/pagos', icono: 'payments' },
    { etiqueta: 'Canchas', ruta: '/canchas', icono: 'stadium', soloAdmin: true },
    { etiqueta: 'Horarios', ruta: '/horarios', icono: 'schedule', soloAdmin: true },
    { etiqueta: 'Equipamiento', ruta: '/equipamientos', icono: 'sports_soccer', soloAdmin: true },
    { etiqueta: 'Usuarios', ruta: '/usuarios', icono: 'group', soloAdmin: true },
    { etiqueta: 'Tipos de cancha', ruta: '/tipos-cancha', icono: 'category', soloAdmin: true },
    { etiqueta: 'Tipos de evento', ruta: '/tipos-evento', icono: 'label', soloAdmin: true }
  ];

  protected readonly itemsVisibles = computed(() =>
    this.items.filter((item) => !item.soloAdmin || this.auth.esAdmin())
  );

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
