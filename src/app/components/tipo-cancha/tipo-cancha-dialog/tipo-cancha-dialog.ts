import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TipoCanchaFormComponent } from '../tipo-cancha-form/tipo-cancha-form';
import { TipoCanchaService } from '../../../services/tipo-cancha.service';
import { TipoCancha, TipoCanchaDto } from '../../../models/tipo-cancha';

/**
 * Envuelve al formulario en un diálogo de Material y se encarga de guardar.
 *
 * El request se hace acá y no en el listado porque si el backend rechaza los
 * datos (un nombre duplicado, por ejemplo) el diálogo tiene que seguir abierto
 * con lo que el usuario había cargado. Se cierra con el tipo de cancha ya
 * guardado, o con `undefined` si el usuario cancela.
 */
@Component({
  selector: 'app-tipo-cancha-dialog',
  imports: [MatDialogModule, TipoCanchaFormComponent],
  templateUrl: './tipo-cancha-dialog.html'
})
export class TipoCanchaDialogComponent {

  protected tipoCancha = inject<TipoCancha | null>(MAT_DIALOG_DATA);

  private tipoCanchaService = inject(TipoCanchaService);

  private dialogRef = inject(MatDialogRef<TipoCanchaDialogComponent, TipoCancha>);

  /** Deshabilita los botones del formulario mientras el request está en curso. */
  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.tipoCancha ? 'Editar tipo de cancha' : 'Nuevo tipo de cancha';
  }

  protected alGuardar(dto: TipoCanchaDto): void {
    const tipoCancha = this.tipoCancha;

    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, el listado no se enteraría del alta.
    this.dialogRef.disableClose = true;

    const peticion = tipoCancha
      ? this.tipoCanchaService.actualizar(tipoCancha.id, dto)
      : this.tipoCanchaService.crear(dto);

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
