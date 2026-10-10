import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PagoFormComponent } from '../pago-form/pago-form';
import { PagoService } from '../../../services/pago.service';
import { Pago, PagoDto } from '../../../models/pago';
import { Reserva } from '../../../models/reserva';

export interface DatosPagoDialog {
  pago: Pago | null;
  reservas: Reserva[];
}

@Component({
  selector: 'app-pago-dialog',
  imports: [MatDialogModule, PagoFormComponent],
  templateUrl: './pago-dialog.html'
})
export class PagoDialogComponent {

  protected datos = inject<DatosPagoDialog>(MAT_DIALOG_DATA);

  private pagoService = inject(PagoService);

  private dialogRef = inject(MatDialogRef<PagoDialogComponent, Pago>);

  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.datos.pago ? 'Corregir el pago' : 'Registrar un pago';
  }

  protected alGuardar(dto: PagoDto): void {
    const pago = this.datos.pago;

    this.guardando.set(true);
    this.dialogRef.disableClose = true;

    const peticion = pago
      ? this.pagoService.actualizar(pago.id, { metodo: dto.metodo })
      : this.pagoService.crear(dto);

    peticion.subscribe({
      next: (guardado) => this.dialogRef.close(guardado),
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
