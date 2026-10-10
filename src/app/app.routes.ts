import { Routes } from '@angular/router';
import { adminGuard, invitadoGuard, sesionGuard } from './core/guards/acceso.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión | SportBook',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./components/login/login').then((m) => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./components/layout/layout').then((m) => m.LayoutComponent),
    canActivate: [sesionGuard],
    canActivateChild: [sesionGuard],
    children: [
      {
        path: '',
        redirectTo: 'reservar',
        pathMatch: 'full'
      },
      {
        path: 'reservar',
        title: 'Reservar | SportBook',
        loadComponent: () => import('./components/reserva/reserva').then((m) => m.ReservaComponent)
      },
      {
        path: 'reservas',
        title: 'Reservas | SportBook',
        loadComponent: () =>
          import('./components/gestion-reservas/gestion-reservas').then(
            (m) => m.GestionReservasComponent
          )
      },
      {
        path: 'perfil',
        title: 'Mi perfil | SportBook',
        loadComponent: () => import('./components/perfil/perfil').then((m) => m.PerfilComponent)
      },
      {
        path: 'pagos',
        title: 'Pagos | SportBook',
        loadComponent: () => import('./components/pago/pago').then((m) => m.PagoComponent)
      },
      {
        path: 'eventos',
        title: 'Eventos | SportBook',
        loadComponent: () => import('./components/evento/evento').then((m) => m.EventoComponent)
      },
      {
        path: 'tipos-cancha',
        title: 'Tipos de cancha | SportBook',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./components/tipo-cancha/tipo-cancha').then((m) => m.TipoCanchaComponent)
      },
      {
        path: 'tipos-evento',
        title: 'Tipos de evento | SportBook',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./components/tipo-evento/tipo-evento').then((m) => m.TipoEventoComponent)
      },
      {
        path: 'canchas',
        title: 'Canchas | SportBook',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/cancha/cancha').then((m) => m.CanchaComponent)
      },
      {
        path: 'horarios',
        title: 'Horarios | SportBook',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/horario/horario').then((m) => m.HorarioComponent)
      },
      {
        path: 'equipamientos',
        title: 'Equipamiento | SportBook',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./components/equipamiento/equipamiento').then((m) => m.EquipamientoComponent)
      },
      {
        path: 'usuarios',
        title: 'Usuarios | SportBook',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/usuario/usuario').then((m) => m.UsuarioComponent)
      },
      {
        path: '**',
        title: 'Página no encontrada | SportBook',
        loadComponent: () =>
          import('./components/no-encontrado/no-encontrado').then((m) => m.NoEncontradoComponent)
      }
    ]
  }
];
