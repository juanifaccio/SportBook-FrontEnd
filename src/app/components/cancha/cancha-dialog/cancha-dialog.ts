import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CanchaFormComponent } from '../cancha-form/cancha-form';
import { CanchaService } from '../../../services/cancha.service';
import { Cancha, CanchaDto } from '../../../models/cancha';
import { TipoCancha } from '../../../models/tipo-cancha';

export interface DatosCanchaDialog {
  cancha: Cancha | null;
  tipos: TipoCancha[];
}

@Component({
  selector: 'app-cancha-dialog',
  imports: [MatDialogModule, CanchaFormComponent],
  templateUrl: './cancha-dialog.html'
})
export class CanchaDialogComponent {

  protected datos = inject<DatosCanchaDialog>(MAT_DIALOG_DATA);

  private canchaService = inject(CanchaService);

  private dialogRef = inject(MatDialogRef<CanchaDialogComponent, Cancha>);

  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.datos.cancha ? 'Editar cancha' : 'Nueva cancha';
  }

  protected alGuardar(dto: CanchaDto): void {
    const cancha = this.datos.cancha;

    this.guardando.set(true);
    this.dialogRef.disableClose = true;

    const peticion = cancha
      ? this.canchaService.actualizar(cancha.id, dto)
      : this.canchaService.crear(dto);

    peticion.subscribe({
      next: (guardada) => this.dialogRef.close(guardada),
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
