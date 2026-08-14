import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { HorarioFormComponent } from '../horario-form/horario-form';
import { HorarioService } from '../../../services/horario.service';
import { Horario, HorarioDto } from '../../../models/horario';
import { Cancha } from '../../../models/cancha';

/** Datos que necesita el diálogo: el turno a editar y las opciones del selector. */
export interface DatosHorarioDialog {
  horario: Horario | null;
  canchas: Cancha[];
  /** Cancha elegida en la pantalla, que es la que propone el alta. */
  canchaSeleccionada: number | null;
}

/**
 * Envuelve al formulario en un diálogo de Material y se encarga de guardar.
 *
 * El request se hace acá y no en el listado porque si el backend rechaza los
 * datos (un turno que se superpone con otro, por ejemplo) el diálogo tiene que
 * seguir abierto con lo que el usuario había cargado. Se cierra con el turno ya
 * guardado, o con `undefined` si el usuario cancela.
 */
@Component({
  selector: 'app-horario-dialog',
  imports: [MatDialogModule, HorarioFormComponent],
  templateUrl: './horario-dialog.html'
})
export class HorarioDialogComponent {

  protected datos = inject<DatosHorarioDialog>(MAT_DIALOG_DATA);

  private horarioService = inject(HorarioService);

  private dialogRef = inject(MatDialogRef<HorarioDialogComponent, Horario>);

  /** Deshabilita los botones del formulario mientras el request está en curso. */
  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.datos.horario ? 'Editar horario' : 'Nuevo horario';
  }

  protected alGuardar(dto: HorarioDto): void {
    const horario = this.datos.horario;

    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, el listado no se enteraría del alta.
    this.dialogRef.disableClose = true;

    const peticion = horario
      ? this.horarioService.actualizar(horario.id, dto)
      : this.horarioService.crear(dto);

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
