import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ETIQUETAS_ESTADO_RESERVA, Reserva } from '../../../models/reserva';
import { ETIQUETAS_METODO_PAGO, saldoDe } from '../../../models/pago';
import { formatearFecha } from '../../../core/fechas';

@Component({
  selector: 'app-reserva-detalle-dialog',
  imports: [CurrencyPipe, MatDialogModule, MatButtonModule],
  templateUrl: './reserva-detalle-dialog.html',
  styleUrl: './reserva-detalle-dialog.css'
})
export class ReservaDetalleDialogComponent {

  protected reserva = inject<Reserva>(MAT_DIALOG_DATA);

  protected readonly etiquetasEstado = ETIQUETAS_ESTADO_RESERVA;

  protected readonly etiquetasMetodo = ETIQUETAS_METODO_PAGO;

  protected readonly pagos = computed(() => this.reserva.pagos ?? []);

  protected readonly equipamiento = computed(() => this.reserva.equipamientos ?? []);

  protected readonly saldo = computed(() => saldoDe(this.reserva));

  protected readonly formatearFecha = formatearFecha;

}
