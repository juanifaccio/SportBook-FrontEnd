import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CanchaFormComponent } from '../cancha-form/cancha-form';
import { Cancha, CanchaDto } from '../../../models/cancha';
import { TipoCancha } from '../../../models/tipo-cancha';

/** Datos que necesita el diálogo: la cancha a editar y las opciones del selector. */
export interface DatosCanchaDialog {
  cancha: Cancha | null;
  tipos: TipoCancha[];
}

/**
 * Envuelve al formulario en un diálogo de Material. Su única responsabilidad es
 * traducir entre la API del diálogo (datos inyectados / valor de cierre) y la
 * del formulario (inputs / outputs), de modo que el formulario siga siendo
 * reutilizable fuera de un diálogo.
 *
 * Se cierra con el DTO cargado, o con `undefined` si el usuario cancela.
 */
@Component({
  selector: 'app-cancha-dialog',
  imports: [MatDialogModule, CanchaFormComponent],
  templateUrl: './cancha-dialog.html'
})
export class CanchaDialogComponent {

  protected datos = inject<DatosCanchaDialog>(MAT_DIALOG_DATA);

  private dialogRef = inject(MatDialogRef<CanchaDialogComponent, CanchaDto>);

  protected get titulo(): string {
    return this.datos.cancha ? 'Editar cancha' : 'Nueva cancha';
  }

  protected alGuardar(dto: CanchaDto): void {
    this.dialogRef.close(dto);
  }

  protected alCancelar(): void {
    this.dialogRef.close();
  }

}
