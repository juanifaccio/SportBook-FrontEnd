import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ETIQUETAS_ESTADO_RESERVA, Reserva } from '../../../models/reserva';
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

  protected readonly formatearFecha = formatearFecha;

}
