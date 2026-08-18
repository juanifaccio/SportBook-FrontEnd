import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PagoFormComponent } from '../pago-form/pago-form';
import { PagoService } from '../../../services/pago.service';
import { Pago, PagoDto } from '../../../models/pago';
import { Reserva } from '../../../models/reserva';

/**
 * Lo que el listado le pasa al diálogo: el pago a corregir (o `null` para
 * registrar uno nuevo) y las reservas que todavía deben plata.
 */
export interface DatosPagoDialog {
  pago: Pago | null;
  reservas: Reserva[];
}

/**
 * Envuelve al formulario en un diálogo de Material y se encarga de guardar.
 *
 * El request se hace acá y no en el listado porque si el backend lo rechaza —un
 * monto que supera el saldo, por ejemplo— el diálogo tiene que seguir abierto con
 * lo que el usuario había cargado. Se cierra con el pago ya guardado, o con
 * `undefined` si se cancela.
 */
@Component({
  selector: 'app-pago-dialog',
  imports: [MatDialogModule, PagoFormComponent],
  templateUrl: './pago-dialog.html'
})
export class PagoDialogComponent {

  protected datos = inject<DatosPagoDialog>(MAT_DIALOG_DATA);

  private pagoService = inject(PagoService);

  private dialogRef = inject(MatDialogRef<PagoDialogComponent, Pago>);

  /** Deshabilita los botones del formulario mientras el request está en curso. */
  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.datos.pago ? 'Corregir el pago' : 'Registrar un pago';
  }

  protected alGuardar(dto: PagoDto): void {
    const pago = this.datos.pago;

    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, el listado no se enteraría del alta.
    this.dialogRef.disableClose = true;

    // Al corregir se manda solo el método: el monto y la reserva de un pago no
    // se editan, y el backend ignora todo lo demás.
    const peticion = pago
      ? this.pagoService.actualizar(pago.id, { metodo: dto.metodo })
      : this.pagoService.crear(dto);

    peticion.subscribe({
      next: (guardado) => this.dialogRef.close(guardado),
      // El mensaje de error ya lo mostró el interceptor; acá solo se devuelve el
      // control del formulario para que el usuario corrija y reintente.
      error: () => {
        this.guardando.set(false);
        this.dialogRef.disableClose = false;
      }
    });
  }

  protected alCancelar(): void {
    this.dialogRef.close();
  }

}
