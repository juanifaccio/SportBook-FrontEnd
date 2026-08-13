import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DatosConfirmacion {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
}

/**
 * Diálogo genérico de confirmación para acciones destructivas. Se cierra con
 * `true` si el usuario confirma y con `false`/`undefined` si cancela.
 */
@Component({
  selector: 'app-confirmacion',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirmacion.html'
})
export class ConfirmacionComponent {

  protected datos = inject<DatosConfirmacion>(MAT_DIALOG_DATA);

  private dialogRef = inject(MatDialogRef<ConfirmacionComponent, boolean>);

  protected confirmar(): void {
    this.dialogRef.close(true);
  }

  protected cancelar(): void {
    this.dialogRef.close(false);
  }

}
