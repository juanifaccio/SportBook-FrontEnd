import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, map } from 'rxjs';
import { EventoService } from '../../services/evento.service';
import { ReservaService } from '../../services/reserva.service';
import { TipoEventoService } from '../../services/tipo-evento.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Evento } from '../../models/evento';
import { Reserva, etiquetaDeReserva } from '../../models/reserva';
import { TipoEvento } from '../../models/tipo-evento';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { DatosEventoDialog, EventoDialogComponent } from './evento-dialog/evento-dialog';
import {
  ConfirmacionComponent,
  DatosConfirmacion
} from '../shared/confirmacion/confirmacion';

@Component({
  selector: 'app-evento',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './evento.html',
  styleUrl: './evento.css'
})
export class EventoComponent implements OnInit {

  private eventoService = inject(EventoService);
  private reservaService = inject(ReservaService);
  private tipoEventoService = inject(TipoEventoService);
  private auth = inject(AuthService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly esAdmin = this.auth.esAdmin;

  protected readonly eventos = signal<Evento[]>([]);
  protected readonly reservas = signal<Reserva[]>([]);
  protected readonly tipos = signal<TipoEvento[]>([]);

  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = computed(() =>
    this.esAdmin()
      ? ['reserva', 'tipo', 'descripcion', 'personas', 'usuario', 'acciones']
      : ['reserva', 'tipo', 'descripcion', 'personas', 'acciones']
  );

  protected readonly reservasDisponibles = computed(() => {
    const conEvento = new Set(this.eventos().map((evento) => evento.reservaId));

    return this.reservas().filter(
      (reserva) => reserva.estado !== 'CANCELADA' && !conEvento.has(reserva.id)
    );
  });

  protected readonly hayTipos = computed(() => this.tipos().length > 0);

  protected readonly puedeCrear = computed(
    () => this.hayTipos() && this.reservasDisponibles().length > 0
  );

  protected readonly etiquetaDeReserva = etiquetaDeReserva;

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    forkJoin({
      eventos: this.eventoService.listar(),
      reservas: this.reservaService.listar(),
      tipos: this.tipoEventoService.listar()
    }).subscribe({
      next: ({ eventos, reservas, tipos }) => {
        this.eventos.set(eventos);
        this.reservas.set(reservas);
        this.tipos.set(tipos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  protected abrirAlta(): void {
    this.abrirFormulario(null);
  }

  protected abrirEdicion(evento: Evento): void {
    this.abrirFormulario(evento);
  }

  private abrirFormulario(evento: Evento | null): void {
    const datos: DatosEventoDialog = {
      evento: evento,
      reservas: this.reservasDisponibles(),
      tipos: this.tipos()
    };

    const dialogRef = this.dialog.open<EventoDialogComponent, DatosEventoDialog, Evento>(
      EventoDialogComponent,
      { data: datos, width: '32rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((guardado) => {
      if (!guardado) {
        return;
      }

      if (evento) {
        this.eventos.update((eventos) =>
          eventos.map((uno) => (uno.id === guardado.id ? guardado : uno))
        );
        this.notificacion.exito('Evento actualizado correctamente.');
      } else {
        this.eventos.update((eventos) => [guardado, ...eventos]);
        this.notificacion.exito('Evento creado correctamente.');
      }
    });
  }

  protected confirmarEliminacion(evento: Evento): void {
    const datos: DatosConfirmacion = {
      titulo: 'Eliminar evento',
      mensaje: `¿Seguro que querés eliminar "${evento.descripcion}"? La reserva se conserva; solo se borra el evento.`,
      textoConfirmar: 'Eliminar'
    };

    const dialogRef = this.dialog.open<ConfirmacionComponent, DatosConfirmacion, boolean>(
      ConfirmacionComponent,
      { data: datos, width: '28rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.eliminar(evento.id);
      }
    });
  }

  private eliminar(id: number): void {
    this.eventoService.eliminar(id).subscribe({
      next: () => {
        this.eventos.update((eventos) => eventos.filter((evento) => evento.id !== id));
        this.notificacion.exito('Evento eliminado correctamente.');
      },
      error: () => {}
    });
  }

}
