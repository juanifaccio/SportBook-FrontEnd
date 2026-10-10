import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TipoCanchaFormComponent } from '../tipo-cancha-form/tipo-cancha-form';
import { TipoCanchaService } from '../../../services/tipo-cancha.service';
import { TipoCancha, TipoCanchaDto } from '../../../models/tipo-cancha';

@Component({
  selector: 'app-tipo-cancha-dialog',
  imports: [MatDialogModule, TipoCanchaFormComponent],
  templateUrl: './tipo-cancha-dialog.html'
})
export class TipoCanchaDialogComponent {

  protected tipoCancha = inject<TipoCancha | null>(MAT_DIALOG_DATA);

  private tipoCanchaService = inject(TipoCanchaService);

  private dialogRef = inject(MatDialogRef<TipoCanchaDialogComponent, TipoCancha>);

  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.tipoCancha ? 'Editar tipo de cancha' : 'Nuevo tipo de cancha';
  }

  protected alGuardar(dto: TipoCanchaDto): void {
    const tipoCancha = this.tipoCancha;

    this.guardando.set(true);
    this.dialogRef.disableClose = true;

    const peticion = tipoCancha
      ? this.tipoCanchaService.actualizar(tipoCancha.id, dto)
      : this.tipoCanchaService.crear(dto);

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
