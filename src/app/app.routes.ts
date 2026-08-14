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
    path: '**',
    title: 'Página no encontrada — SportBook',
    loadComponent: () =>
      import('./components/no-encontrado/no-encontrado').then((m) => m.NoEncontradoComponent)
  }
];
