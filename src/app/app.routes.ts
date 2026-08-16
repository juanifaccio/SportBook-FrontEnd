import { Routes } from '@angular/router';

/**
 * Cada pantalla se carga con `loadComponent` (lazy loading): así el bundle
 * inicial no crece a medida que se sumen las entidades del dominio.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tipos-cancha',
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
    path: 'tipos-cancha',
    title: 'Tipos de cancha — SportBook',
    loadComponent: () =>
      import('./components/tipo-cancha/tipo-cancha').then((m) => m.TipoCanchaComponent)
  },
  {
    path: 'tipos-evento',
    title: 'Tipos de evento — SportBook',
    loadComponent: () =>
      import('./components/tipo-evento/tipo-evento').then((m) => m.TipoEventoComponent)
  },
  {
    path: 'canchas',
    title: 'Canchas — SportBook',
    loadComponent: () => import('./components/cancha/cancha').then((m) => m.CanchaComponent)
  },
  {
    path: 'horarios',
    title: 'Horarios — SportBook',
    loadComponent: () => import('./components/horario/horario').then((m) => m.HorarioComponent)
  },
  {
    path: 'usuarios',
    title: 'Usuarios — SportBook',
    loadComponent: () => import('./components/usuario/usuario').then((m) => m.UsuarioComponent)
  },
  {
    path: '**',
    title: 'Página no encontrada — SportBook',
    loadComponent: () =>
      import('./components/no-encontrado/no-encontrado').then((m) => m.NoEncontradoComponent)
  }
];
