import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TipoEventoFormComponent } from '../tipo-evento-form/tipo-evento-form';
import { TipoEvento, TipoEventoDto } from '../../../models/tipo-evento';

/**
 * Envuelve al formulario en un diálogo de Material. Su única responsabilidad es
 * traducir entre la API del diálogo (datos inyectados / valor de cierre) y la
 * del formulario (input / outputs), de modo que el formulario siga siendo
 * reutilizable fuera de un diálogo.
 *
 * Se cierra con el DTO cargado, o con `undefined` si el usuario cancela.
 */
@Component({
  selector: 'app-tipo-evento-dialog',
  imports: [MatDialogModule, TipoEventoFormComponent],
  templateUrl: './tipo-evento-dialog.html'
})
export class TipoEventoDialogComponent {

  protected tipoEvento = inject<TipoEvento | null>(MAT_DIALOG_DATA);

  private dialogRef = inject(MatDialogRef<TipoEventoDialogComponent, TipoEventoDto>);

  protected get titulo(): string {
    return this.tipoEvento ? 'Editar tipo de evento' : 'Nuevo tipo de evento';
  }

  protected alGuardar(dto: TipoEventoDto): void {
    this.dialogRef.close(dto);
  }

  protected alCancelar(): void {
    this.dialogRef.close();
  }

}
