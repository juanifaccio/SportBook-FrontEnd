import { Component, OnInit, inject, signal } from '@angular/core';
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
import { forkJoin, map } from 'rxjs';
import { ReservaService } from '../../services/reserva.service';
import { CanchaService } from '../../services/cancha.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Cancha } from '../../models/cancha';
import {
  ETIQUETAS_ESTADO_RESERVA,
  EstadoReserva,
  FiltrosReserva,
  Reserva
} from '../../models/reserva';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { formatearFecha, yaEmpezo } from '../../core/fechas';
import {
  DatosReprogramarDialog,
  ReprogramarDialogComponent
} from './reprogramar-dialog/reprogramar-dialog';
import { ReservaDetalleDialogComponent } from './reserva-detalle-dialog/reserva-detalle-dialog';
import { ConfirmacionComponent, DatosConfirmacion } from '../shared/confirmacion/confirmacion';

/** Opción del filtro de estado, más la de "todos", que no filtra nada. */
const ESTADOS: EstadoReserva[] = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA'];

/**
 * Pantalla de gestión de reservas: el listado de lo ya reservado y las dos
 * cosas que se pueden hacer con una reserva —reprogramarla a otro turno o
 * cancelarla—.
 *
 * Es la contracara de `/reservar`: ahí se ocupa un turno, acá se lo mueve o se
 * lo devuelve.
 */
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
    MatSelectModule
  ],
  templateUrl: './gestion-reservas.html',
  styleUrl: './gestion-reservas.css'
})
export class GestionReservasComponent implements OnInit {

  private reservaService = inject(ReservaService);
  private canchaService = inject(CanchaService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly reservas = signal<Reserva[]>([]);
  protected readonly canchas = signal<Cancha[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  /**
   * Los filtros son del servidor, no de la lista en memoria: el backend ya los
   * soporta, y filtrar acá obligaría a traerse todas las reservas del complejo
   * para descartar la mayoría.
   */
  protected readonly canchaFiltro = signal<number | null>(null);
  protected readonly fechaFiltro = signal('');
  protected readonly estadoFiltro = signal<EstadoReserva | null>(null);

  protected readonly estados = ESTADOS;
  protected readonly etiquetasEstado = ETIQUETAS_ESTADO_RESERVA;

  /** Etiqueta legible del estado de una reserva. */
  protected etiquetaEstado(reserva: Reserva): string {
    return ETIQUETAS_ESTADO_RESERVA[reserva.estado];
  }

  /** En mobile se muestran tarjetas apiladas; desde MD, una tabla. */
  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = ['fecha', 'horario', 'cancha', 'usuario', 'estado', 'total', 'acciones'];

  protected readonly formatearFecha = formatearFecha;

  ngOnInit(): void {
    this.cargar();
  }

  /**
   * Carga inicial: las reservas y las canchas del filtro. Van juntas porque la
   * pantalla no sirve hasta que están las dos.
   */
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
      // El mensaje al usuario ya lo muestra el interceptor; acá solo se refleja
      // el estado en la vista para poder ofrecer un reintento.
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  /** Filtros activos, sin las claves que quedaron vacías. */
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

  protected alCambiarFecha(fecha: string): void {
    this.fechaFiltro.set(fecha);
    this.cargarReservas();
  }

  protected alCambiarEstado(estado: EstadoReserva | null): void {
    this.estadoFiltro.set(estado);
    this.cargarReservas();
  }

  /** Vuelve a pedir el listado con los filtros actuales. Las canchas ya están. */
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

  /**
   * Una reserva cancelada o que ya empezó no se puede tocar: son las mismas dos
   * reglas que aplica el backend. Se comprueban también acá para no ofrecer un
   * botón que solo va a devolver un error.
   */
  protected esGestionable(reserva: Reserva): boolean {
    return reserva.estado !== 'CANCELADA' && !yaEmpezo(reserva.fecha, reserva.horaInicio);
  }

  /** Explica por qué el botón está deshabilitado, en vez de dejarlo mudo. */
  protected motivoNoGestionable(reserva: Reserva): string {
    if (reserva.estado === 'CANCELADA') {
      return 'La reserva está cancelada';
    }

    if (yaEmpezo(reserva.fecha, reserva.horaInicio)) {
      return 'La reserva ya empezó';
    }

    return '';
  }

  /** Detalle completo de la reserva seleccionada. */
  protected verDetalle(reserva: Reserva): void {
    this.dialog.open<ReservaDetalleDialogComponent, Reserva>(ReservaDetalleDialogComponent, {
      data: reserva,
      width: '32rem',
      maxWidth: '95vw'
    });
  }

  /**
   * La reprogramación la resuelve el diálogo, que se cierra recién cuando el
   * backend confirma. Acá solo se refleja en la lista lo que ya quedó guardado.
   */
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
      // Si el botón de echarse atrás dijera "Cancelar", los dos botones dirían
      // lo mismo y harían lo opuesto.
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
      }
    });
  }

  /**
   * Reemplaza la reserva en la lista con la que devolvió el backend. No se
   * vuelve a pedir el listado: el backend ya respondió el objeto resultante, y
   * pedirlo de nuevo sería un viaje de red al pedo que además hace parpadear la
   * pantalla.
   *
   * Si la reserva dejó de cumplir el filtro activo (se canceló mientras se
   * miraban solo las confirmadas), se la saca de la lista en vez de mostrarla
   * fuera de lugar.
   *
   * Una reprogramada conserva su lugar en la lista aunque su fecha ya no
   * corresponda a ese orden: el usuario acaba de actuar sobre esa fila y
   * mandarla a otra posición se la haría perder de vista justo cuando quiere
   * comprobar el cambio. El orden se reacomoda solo en la próxima carga.
   */
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
