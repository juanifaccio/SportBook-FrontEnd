import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { forkJoin, map } from 'rxjs';
import { ReservaService } from '../../services/reserva.service';
import { CanchaService } from '../../services/cancha.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Cancha } from '../../models/cancha';
import {
  ETIQUETAS_ESTADO_RESERVA,
  EstadoReserva,
  FiltrosReserva,
  Reserva
} from '../../models/reserva';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { aDate, aTexto, formatearFecha, yaEmpezo } from '../../core/fechas';
import {
  DatosReprogramarDialog,
  ReprogramarDialogComponent
} from './reprogramar-dialog/reprogramar-dialog';
import { ReservaDetalleDialogComponent } from './reserva-detalle-dialog/reserva-detalle-dialog';
import { ConfirmacionComponent, DatosConfirmacion } from '../shared/confirmacion/confirmacion';

const ESTADOS: EstadoReserva[] = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA'];

@Component({
  selector: 'app-gestion-reservas',
  imports: [
    RouterLink,
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule
  ],
  templateUrl: './gestion-reservas.html',
  styleUrl: './gestion-reservas.css'
})
export class GestionReservasComponent implements OnInit {

  private reservaService = inject(ReservaService);
  private canchaService = inject(CanchaService);
  private auth = inject(AuthService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly esAdmin = this.auth.esAdmin;

  protected readonly reservas = signal<Reserva[]>([]);
  protected readonly canchas = signal<Cancha[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly canchaFiltro = signal<number | null>(null);
  protected readonly fechaFiltro = signal('');
  protected readonly estadoFiltro = signal<EstadoReserva | null>(null);

  protected readonly fechaElegida = computed(() => aDate(this.fechaFiltro()));

  protected readonly estados = ESTADOS;
  protected readonly etiquetasEstado = ETIQUETAS_ESTADO_RESERVA;

  protected etiquetaEstado(reserva: Reserva): string {
    return ETIQUETAS_ESTADO_RESERVA[reserva.estado];
  }

  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = computed(() =>
    this.esAdmin()
      ? ['fecha', 'horario', 'cancha', 'usuario', 'estado', 'total', 'acciones']
      : ['fecha', 'horario', 'cancha', 'estado', 'total', 'acciones']
  );

  protected readonly formatearFecha = formatearFecha;

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    forkJoin({
      reservas: this.reservaService.listar(this.filtros()),
      canchas: this.canchaService.listar()
    }).subscribe({
      next: ({ reservas, canchas }) => {
        this.reservas.set(reservas);
        this.canchas.set(canchas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  private filtros(): FiltrosReserva {
    const filtros: FiltrosReserva = {};
    const cancha = this.canchaFiltro();
    const fecha = this.fechaFiltro();
    const estado = this.estadoFiltro();

    if (cancha !== null) {
      filtros.canchaId = cancha;
    }

    if (fecha) {
      filtros.fecha = fecha;
    }

    if (estado !== null) {
      filtros.estado = estado;
    }

    return filtros;
  }

  protected alCambiarCancha(canchaId: number | null): void {
    this.canchaFiltro.set(canchaId);
    this.cargarReservas();
  }

  protected alCambiarFecha(fecha: Date | null): void {
    this.fechaFiltro.set(fecha ? aTexto(fecha) : '');
    this.cargarReservas();
  }

  protected alCambiarEstado(estado: EstadoReserva | null): void {
    this.estadoFiltro.set(estado);
    this.cargarReservas();
  }

  protected cargarReservas(): void {
    this.cargando.set(true);
    this.error.set(false);

    this.reservaService.listar(this.filtros()).subscribe({
      next: (reservas) => {
        this.reservas.set(reservas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  protected hayFiltros(): boolean {
    return Object.keys(this.filtros()).length > 0;
  }

  protected limpiarFiltros(): void {
    this.canchaFiltro.set(null);
    this.fechaFiltro.set('');
    this.estadoFiltro.set(null);
    this.cargarReservas();
  }

  protected esGestionable(reserva: Reserva): boolean {
    return reserva.estado !== 'CANCELADA' && !yaEmpezo(reserva.fecha, reserva.horaInicio);
  }

  protected motivoNoGestionable(reserva: Reserva): string {
    if (reserva.estado === 'CANCELADA') {
      return 'La reserva está cancelada';
    }

    if (yaEmpezo(reserva.fecha, reserva.horaInicio)) {
      return 'La reserva ya empezó';
    }

    return '';
  }

  protected verDetalle(reserva: Reserva): void {
    this.dialog.open<ReservaDetalleDialogComponent, Reserva>(ReservaDetalleDialogComponent, {
      data: reserva,
      width: '32rem',
      maxWidth: '95vw'
    });
  }

  protected reprogramar(reserva: Reserva): void {
    const datos: DatosReprogramarDialog = {
      reserva: reserva,
      canchas: this.canchas()
    };

    const dialogRef = this.dialog.open<
      ReprogramarDialogComponent,
      DatosReprogramarDialog,
      Reserva
    >(ReprogramarDialogComponent, { data: datos, width: '32rem', maxWidth: '95vw' });

    dialogRef.afterClosed().subscribe((reprogramada) => {
      if (!reprogramada) {
        return;
      }

      this.notificacion.exito('Reserva reprogramada correctamente.');
      this.reemplazar(reprogramada);
    });
  }

  protected confirmarCancelacion(reserva: Reserva): void {
    const datos: DatosConfirmacion = {
      titulo: 'Cancelar reserva',
      mensaje: `¿Seguro que querés cancelar la reserva de ${reserva.cancha?.nombre} del ${formatearFecha(reserva.fecha)} de ${reserva.horaInicio} a ${reserva.horaFin}? El turno va a volver a quedar libre.`,
      textoConfirmar: 'Sí, cancelar',
      textoCancelar: 'Volver'
    };

    const dialogRef = this.dialog.open<ConfirmacionComponent, DatosConfirmacion, boolean>(
      ConfirmacionComponent,
      { data: datos, width: '28rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.cancelar(reserva.id);
      }
    });
  }

  private cancelar(id: number): void {
    this.reservaService.cancelar(id).subscribe({
      next: (cancelada) => {
        this.reemplazar(cancelada);
        this.notificacion.exito('Reserva cancelada. El turno volvió a quedar libre.');
      },
      error: () => {}
    });
  }

  private reemplazar(reserva: Reserva): void {
    const estado = this.estadoFiltro();
    const cancha = this.canchaFiltro();
    const fecha = this.fechaFiltro();

    const sigueEnElFiltro =
      (estado === null || reserva.estado === estado) &&
      (cancha === null || reserva.canchaId === cancha) &&
      (!fecha || reserva.fecha === fecha);

    this.reservas.update((reservas) =>
      sigueEnElFiltro
        ? reservas.map((actual) => (actual.id === reserva.id ? reserva : actual))
        : reservas.filter((actual) => actual.id !== reserva.id)
    );
  }

}
