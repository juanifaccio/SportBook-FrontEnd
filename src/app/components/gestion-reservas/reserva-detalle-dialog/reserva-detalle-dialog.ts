import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ETIQUETAS_ESTADO_RESERVA, Reserva } from '../../../models/reserva';
import { ETIQUETAS_METODO_PAGO, saldoDe } from '../../../models/pago';
import { formatearFecha } from '../../../core/fechas';

/**
 * Detalle completo de una reserva.
 *
 * Cubre el requisito de la cátedra de mostrar un detalle al seleccionar un
 * elemento del listado: la tabla muestra lo que entra en una fila, y acá está
 * todo lo demás —el tipo de cancha, el contacto del usuario, el precio por hora
 * del que sale el total—.
 *
 * Es de solo lectura y no hace requests: la reserva ya vino completa en el
 * listado, con sus tres relaciones incluidas.
 */
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

  /** Los cobros de la reserva, los anulados incluidos: el detalle es historial. */
  protected readonly pagos = computed(() => this.reserva.pagos ?? []);

  /**
   * Lo que falta pagar. Es el mismo cálculo que hace el backend para decidir si
   * la reserva está confirmada; acá solo se muestra.
   */
  protected readonly saldo = computed(() => saldoDe(this.reserva));

  protected readonly formatearFecha = formatearFecha;

}
