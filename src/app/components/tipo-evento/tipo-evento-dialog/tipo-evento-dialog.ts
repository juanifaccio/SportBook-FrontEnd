import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TipoEventoFormComponent } from '../tipo-evento-form/tipo-evento-form';
import { TipoEventoService } from '../../../services/tipo-evento.service';
import { TipoEvento, TipoEventoDto } from '../../../models/tipo-evento';

/**
 * Envuelve al formulario en un diálogo de Material y se encarga de guardar.
 *
 * El request se hace acá y no en el listado porque si el backend rechaza los
 * datos (un nombre duplicado, por ejemplo) el diálogo tiene que seguir abierto
 * con lo que el usuario había cargado. Se cierra con el tipo de evento ya
 * guardado, o con `undefined` si el usuario cancela.
 */
@Component({
  selector: 'app-tipo-evento-dialog',
  imports: [MatDialogModule, TipoEventoFormComponent],
  templateUrl: './tipo-evento-dialog.html'
})
export class TipoEventoDialogComponent {

  protected tipoEvento = inject<TipoEvento | null>(MAT_DIALOG_DATA);

  private tipoEventoService = inject(TipoEventoService);

  private dialogRef = inject(MatDialogRef<TipoEventoDialogComponent, TipoEvento>);

  /** Deshabilita los botones del formulario mientras el request está en curso. */
  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.tipoEvento ? 'Editar tipo de evento' : 'Nuevo tipo de evento';
  }

  protected alGuardar(dto: TipoEventoDto): void {
    const tipoEvento = this.tipoEvento;

    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, el listado no se enteraría del alta.
    this.dialogRef.disableClose = true;

    const peticion = tipoEvento
      ? this.tipoEventoService.actualizar(tipoEvento.id, dto)
      : this.tipoEventoService.crear(dto);

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
