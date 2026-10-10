import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TipoEventoFormComponent } from '../tipo-evento-form/tipo-evento-form';
import { TipoEventoService } from '../../../services/tipo-evento.service';
import { TipoEvento, TipoEventoDto } from '../../../models/tipo-evento';

@Component({
  selector: 'app-tipo-evento-dialog',
  imports: [MatDialogModule, TipoEventoFormComponent],
  templateUrl: './tipo-evento-dialog.html'
})
export class TipoEventoDialogComponent {

  protected tipoEvento = inject<TipoEvento | null>(MAT_DIALOG_DATA);

  private tipoEventoService = inject(TipoEventoService);

  private dialogRef = inject(MatDialogRef<TipoEventoDialogComponent, TipoEvento>);

  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.tipoEvento ? 'Editar tipo de evento' : 'Nuevo tipo de evento';
  }

  protected alGuardar(dto: TipoEventoDto): void {
    const tipoEvento = this.tipoEvento;

    this.guardando.set(true);
    this.dialogRef.disableClose = true;

    const peticion = tipoEvento
      ? this.tipoEventoService.actualizar(tipoEvento.id, dto)
      : this.tipoEventoService.crear(dto);

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
