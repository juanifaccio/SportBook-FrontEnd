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
import { CurrencyPipe } from '@angular/common';
import { forkJoin, map } from 'rxjs';
import { PagoService } from '../../services/pago.service';
import { ReservaService } from '../../services/reserva.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import {
  ETIQUETAS_ESTADO_PAGO,
  ETIQUETAS_METODO_PAGO,
  Pago,
  saldoDe
} from '../../models/pago';
import { Reserva, etiquetaDeReserva } from '../../models/reserva';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { formatearFecha } from '../../core/fechas';
import { DatosPagoDialog, PagoDialogComponent } from './pago-dialog/pago-dialog';
import {
  ConfirmacionComponent,
  DatosConfirmacion
} from '../shared/confirmacion/confirmacion';

/**
 * Pantalla de pagos: lo que se cobró por cada reserva.
 *
 * Sirve a los dos roles, pero no igual. La plata la cobra el complejo, así que
 * registrar, corregir y anular son cosa del administrador; un cliente entra a ver
 * los pagos de sus propias reservas, y eso ya lo decide el backend.
 */
@Component({
  selector: 'app-pago',
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './pago.html',
  styleUrl: './pago.css'
})
export class PagoComponent implements OnInit {

  private pagoService = inject(PagoService);
  private reservaService = inject(ReservaService);
  private auth = inject(AuthService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly esAdmin = this.auth.esAdmin;

  protected readonly pagos = signal<Pago[]>([]);
  protected readonly reservas = signal<Reserva[]>([]);

  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  /** En mobile se muestran tarjetas apiladas; desde MD, una tabla. */
  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = computed(() => {
    const base = ['fecha', 'reserva', 'monto', 'metodo', 'estado'];

    // Al cliente no le hace falta la columna del dueño —todas las reservas son
    // suyas— ni las acciones, que no puede usar.
    return this.esAdmin() ? [...base, 'usuario', 'acciones'] : base;
  });

  /**
   * Las reservas a las que se les puede cobrar: las que no están canceladas y
   * todavía deben plata. Se deriva de lo cargado, así registrar o anular un pago
   * actualiza el selector solo.
   */
  protected readonly reservasConSaldo = computed(() =>
    this.reservas().filter((reserva) => reserva.estado !== 'CANCELADA' && saldoDe(reserva) > 0)
  );

  protected readonly puedeRegistrar = computed(
    () => this.esAdmin() && this.reservasConSaldo().length > 0
  );

  // Como métodos y no como los mapas sueltos: la fila de `mat-table` llega al
  // template como `any`, y usarla para indexar un `Record` tipado no compila.
  protected etiquetaMetodo(pago: Pago): string {
    return ETIQUETAS_METODO_PAGO[pago.metodo];
  }

  protected etiquetaEstado(pago: Pago): string {
    return ETIQUETAS_ESTADO_PAGO[pago.estado];
  }

  protected readonly etiquetaDeReserva = etiquetaDeReserva;
  protected readonly formatearFecha = formatearFecha;

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    // Las reservas se piden junto con los pagos: sin ellas no se puede saber a
    // cuáles les falta plata ni ofrecerlas en el alta.
    forkJoin({
      pagos: this.pagoService.listar(),
      reservas: this.reservaService.listar()
    }).subscribe({
      next: ({ pagos, reservas }) => {
        this.pagos.set(pagos);
        this.reservas.set(reservas);
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

  protected abrirAlta(): void {
    this.abrirFormulario(null);
  }

  protected abrirCorreccion(pago: Pago): void {
    this.abrirFormulario(pago);
  }

  /**
   * El alta y la corrección las resuelve el diálogo, que se cierra recién cuando
   * el backend confirma.
   *
   * Después de un alta se vuelve a cargar todo: registrar un pago puede haber
   * dejado la reserva CONFIRMADA, y ese estado se ve en esta misma pantalla.
   */
  private abrirFormulario(pago: Pago | null): void {
    const datos: DatosPagoDialog = {
      pago: pago,
      reservas: this.reservasConSaldo()
    };

    const dialogRef = this.dialog.open<PagoDialogComponent, DatosPagoDialog, Pago>(
      PagoDialogComponent,
      { data: datos, width: '32rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((guardado) => {
      if (!guardado) {
        return;
      }

      if (pago) {
        this.pagos.update((pagos) =>
          pagos.map((uno) => (uno.id === guardado.id ? guardado : uno))
        );
        this.notificacion.exito('Pago actualizado correctamente.');
      } else {
        this.notificacion.exito('Pago registrado correctamente.');
        this.cargar();
      }
    });
  }

  protected confirmarAnulacion(pago: Pago): void {
    const datos: DatosConfirmacion = {
      titulo: 'Anular el pago',
      mensaje:
        'El pago se conserva como historial, pero deja de contar: si con esto la reserva ' +
        'queda impaga, vuelve a estar pendiente.',
      textoConfirmar: 'Anular'
    };

    const dialogRef = this.dialog.open<ConfirmacionComponent, DatosConfirmacion, boolean>(
      ConfirmacionComponent,
      { data: datos, width: '28rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.anular(pago.id);
      }
    });
  }

  private anular(id: number): void {
    this.pagoService.anular(id).subscribe({
      next: () => {
        this.notificacion.exito('Pago anulado correctamente.');
        // Anular puede haber devuelto la reserva a PENDIENTE y liberado saldo:
        // se recarga todo para que el listado y el selector queden al día.
        this.cargar();
      }
    });
  }

  protected estaAnulado(pago: Pago): boolean {
    return pago.estado === 'ANULADO';
  }

}
