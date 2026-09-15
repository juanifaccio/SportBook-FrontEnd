import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { EquipamientoFormComponent } from '../equipamiento-form/equipamiento-form';
import { EquipamientoService } from '../../../services/equipamiento.service';
import { Equipamiento, EquipamientoDto } from '../../../models/equipamiento';

/**
 * Envuelve al formulario en un diálogo de Material y se encarga de guardar.
 *
 * El request se hace acá y no en el listado porque si el backend rechaza los
 * datos (un nombre repetido, por ejemplo) el diálogo tiene que seguir abierto
 * con lo que el usuario había cargado. Se cierra con el equipamiento ya
 * guardado, o con `undefined` si el usuario cancela.
 */
@Component({
  selector: 'app-equipamiento-dialog',
  imports: [MatDialogModule, EquipamientoFormComponent],
  templateUrl: './equipamiento-dialog.html'
})
export class EquipamientoDialogComponent {

  protected equipamiento = inject<Equipamiento | null>(MAT_DIALOG_DATA);

  private equipamientoService = inject(EquipamientoService);

  private dialogRef = inject(MatDialogRef<EquipamientoDialogComponent, Equipamiento>);

  /** Deshabilita los botones del formulario mientras el request está en curso. */
  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.equipamiento ? 'Editar equipamiento' : 'Nuevo equipamiento';
  }

  protected alGuardar(dto: EquipamientoDto): void {
    const equipamiento = this.equipamiento;

    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, el listado no se enteraría del alta.
    this.dialogRef.disableClose = true;

    const peticion = equipamiento
      ? this.equipamientoService.actualizar(equipamiento.id, dto)
      : this.equipamientoService.crear(dto);

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
