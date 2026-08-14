import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CanchaFormComponent } from '../cancha-form/cancha-form';
import { CanchaService } from '../../../services/cancha.service';
import { Cancha, CanchaDto } from '../../../models/cancha';
import { TipoCancha } from '../../../models/tipo-cancha';

/** Datos que necesita el diálogo: la cancha a editar y las opciones del selector. */
export interface DatosCanchaDialog {
  cancha: Cancha | null;
  tipos: TipoCancha[];
}

/**
 * Envuelve al formulario en un diálogo de Material y se encarga de guardar.
 *
 * El request se hace acá y no en el listado porque si el backend rechaza los
 * datos (un nombre duplicado, por ejemplo) el diálogo tiene que seguir abierto
 * con lo que el usuario había cargado. Se cierra con la cancha ya guardada, o
 * con `undefined` si el usuario cancela.
 */
@Component({
  selector: 'app-cancha-dialog',
  imports: [MatDialogModule, CanchaFormComponent],
  templateUrl: './cancha-dialog.html'
})
export class CanchaDialogComponent {

  protected datos = inject<DatosCanchaDialog>(MAT_DIALOG_DATA);

  private canchaService = inject(CanchaService);

  private dialogRef = inject(MatDialogRef<CanchaDialogComponent, Cancha>);

  /** Deshabilita los botones del formulario mientras el request está en curso. */
  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.datos.cancha ? 'Editar cancha' : 'Nueva cancha';
  }

  protected alGuardar(dto: CanchaDto): void {
    const cancha = this.datos.cancha;

    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, el listado no se enteraría del alta.
    this.dialogRef.disableClose = true;

    const peticion = cancha
      ? this.canchaService.actualizar(cancha.id, dto)
      : this.canchaService.crear(dto);

    peticion.subscribe({
      next: (guardada) => this.dialogRef.close(guardada),
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
