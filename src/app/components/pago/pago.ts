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

  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = computed(() => {
    const base = ['fecha', 'reserva', 'monto', 'metodo', 'estado'];

    return this.esAdmin() ? [...base, 'usuario', 'acciones'] : base;
  });

  protected readonly reservasConSaldo = computed(() =>
    this.reservas().filter((reserva) => reserva.estado !== 'CANCELADA' && saldoDe(reserva) > 0)
  );

  protected readonly puedeRegistrar = computed(
    () => this.esAdmin() && this.reservasConSaldo().length > 0
  );

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

    forkJoin({
      pagos: this.pagoService.listar(),
      reservas: this.reservaService.listar()
    }).subscribe({
      next: ({ pagos, reservas }) => {
        this.pagos.set(pagos);
        this.reservas.set(reservas);
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

  protected abrirCorreccion(pago: Pago): void {
    this.abrirFormulario(pago);
  }

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
        this.cargar();
      },
      error: () => {}
    });
  }

  protected estaAnulado(pago: Pago): boolean {
    return pago.estado === 'ANULADO';
  }

}
