import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReservaService } from '../../../services/reserva.service';
import { Cancha } from '../../../models/cancha';
import { Horario } from '../../../models/horario';
import { Usuario } from '../../../models/usuario';

/** Lo que hay que mostrar en el resumen antes de confirmar. */
export interface DatosReservaDialog {
  cancha: Cancha;
  horario: Horario;
  usuario: Usuario;
  /** Total calculado en la pantalla, solo para mostrarlo. */
  precioTotal: number;
}

/**
 * Resumen de la reserva y confirmación.
 *
 * El request se hace acá y no en la pantalla porque si el backend lo rechaza
 * (alguien se adelantó y tomó el turno, por ejemplo) el diálogo tiene que seguir
 * abierto para que el usuario decida qué hacer. Se cierra con `true` cuando la
 * reserva quedó guardada, y con `undefined` si se cancela.
 *
 * No reutiliza `ConfirmacionComponent`: ese es genérico para acciones
 * destructivas y no hace requests.
 */
@Component({
  selector: 'app-reserva-dialog',
  imports: [CurrencyPipe, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './reserva-dialog.html',
  styleUrl: './reserva-dialog.css'
})
export class ReservaDialogComponent {

  protected datos = inject<DatosReservaDialog>(MAT_DIALOG_DATA);

  private reservaService = inject(ReservaService);

  private dialogRef = inject(MatDialogRef<ReservaDialogComponent, boolean>);

  /** Deshabilita los botones mientras el request está en curso. */
  protected readonly guardando = signal(false);

  /**
   * La fecha viaja como "AAAA-MM-DD" y se muestra como "DD/MM/AAAA". Se
   * reordena el texto en vez de construir un `Date`, que interpretaría la fecha
   * en UTC y mostraría el día anterior.
   */
  protected get fechaFormateada(): string {
    return this.datos.horario.fecha.split('-').reverse().join('/');
  }

  protected confirmar(): void {
    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, la pantalla no se enteraría de la
    // reserva y seguiría mostrando el turno como libre.
    this.dialogRef.disableClose = true;

    this.reservaService
      .crear({
        horarioId: this.datos.horario.id,
        usuarioId: this.datos.usuario.id
      })
      .subscribe({
        next: () => this.dialogRef.close(true),
        // El mensaje de error ya lo mostró el interceptor; acá solo se devuelve
        // el control para que el usuario elija otro turno o reintente.
        error: () => {
          this.guardando.set(false);
          this.dialogRef.disableClose = false;
        }
      });
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

}
