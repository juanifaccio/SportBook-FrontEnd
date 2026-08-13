import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TipoCanchaFormComponent } from '../tipo-cancha-form/tipo-cancha-form';
import { TipoCancha, TipoCanchaDto } from '../../../models/tipo-cancha';

/**
 * Envuelve al formulario en un diálogo de Material. Su única responsabilidad es
 * traducir entre la API del diálogo (datos inyectados / valor de cierre) y la
 * del formulario (input / outputs), de modo que el formulario siga siendo
 * reutilizable fuera de un diálogo.
 *
 * Se cierra con el DTO cargado, o con `undefined` si el usuario cancela.
 */
@Component({
  selector: 'app-tipo-cancha-dialog',
  imports: [MatDialogModule, TipoCanchaFormComponent],
  templateUrl: './tipo-cancha-dialog.html'
})
export class TipoCanchaDialogComponent {

  protected tipoCancha = inject<TipoCancha | null>(MAT_DIALOG_DATA);

  private dialogRef = inject(MatDialogRef<TipoCanchaDialogComponent, TipoCanchaDto>);

  protected get titulo(): string {
    return this.tipoCancha ? 'Editar tipo de cancha' : 'Nuevo tipo de cancha';
  }

  protected alGuardar(dto: TipoCanchaDto): void {
    this.dialogRef.close(dto);
  }

  protected alCancelar(): void {
    this.dialogRef.close();
  }

}
