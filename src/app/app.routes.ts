import { Routes } from '@angular/router';
import { adminGuard, invitadoGuard, sesionGuard } from './core/guards/acceso.guard';

/**
 * Cada pantalla se carga con `loadComponent` (lazy loading): así el bundle
 * inicial no crece a medida que se sumen las entidades del dominio.
 *
 * El login queda fuera del layout —no hay menú que ofrecerle a quien todavía no
 * entró— y el resto cuelga de él detrás del `sesionGuard`. Las pantallas de
 * administración del complejo suman el `adminGuard`; reservar y ver las reservas
 * las usan los dos roles.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión — SportBook',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./components/login/login').then((m) => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./components/layout/layout').then((m) => m.LayoutComponent),
    canActivate: [sesionGuard],
    // Y en cada hijo, no solo al entrar: sin esto, cerrar sesión desde una
    // pantalla ya abierta no impediría navegar a otra.
    canActivateChild: [sesionGuard],
    children: [
      {
        path: '',
        // Reservar y no el primer ABM: es el caso de uso central y la única
        // pantalla que sirve para los dos roles por igual.
        redirectTo: 'reservar',
        pathMatch: 'full'
      },
      {
        path: 'reservar',
        title: 'Reservar — SportBook',
        loadComponent: () => import('./components/reserva/reserva').then((m) => m.ReservaComponent)
      },
      {
        path: 'reservas',
        title: 'Reservas — SportBook',
        loadComponent: () =>
          import('./components/gestion-reservas/gestion-reservas').then(
            (m) => m.GestionReservasComponent
          )
      },
      {
        path: 'perfil',
        title: 'Mi perfil — SportBook',
        // Sin `adminGuard`: la cuenta propia la gestiona cualquiera que tenga
        // sesión, sea del rol que sea.
        loadComponent: () => import('./components/perfil/perfil').then((m) => m.PerfilComponent)
      },
      {
        path: 'eventos',
        title: 'Eventos — SportBook',
        // Sin `adminGuard` a propósito: el evento es de quien es la reserva, así
        // que el cliente entra a gestionar los suyos y el backend le devuelve
        // solamente esos.
        loadComponent: () => import('./components/evento/evento').then((m) => m.EventoComponent)
      },
      {
        path: 'tipos-cancha',
        title: 'Tipos de cancha — SportBook',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./components/tipo-cancha/tipo-cancha').then((m) => m.TipoCanchaComponent)
      },
      {
        path: 'tipos-evento',
        title: 'Tipos de evento — SportBook',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./components/tipo-evento/tipo-evento').then((m) => m.TipoEventoComponent)
      },
      {
        path: 'canchas',
        title: 'Canchas — SportBook',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/cancha/cancha').then((m) => m.CanchaComponent)
      },
      {
        path: 'horarios',
        title: 'Horarios — SportBook',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/horario/horario').then((m) => m.HorarioComponent)
      },
      {
        path: 'usuarios',
        title: 'Usuarios — SportBook',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/usuario/usuario').then((m) => m.UsuarioComponent)
      },
      {
        path: '**',
        title: 'Página no encontrada — SportBook',
        loadComponent: () =>
          import('./components/no-encontrado/no-encontrado').then((m) => m.NoEncontradoComponent)
      }
    ]
  }
];
