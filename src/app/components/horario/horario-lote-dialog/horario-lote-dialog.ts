import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { HorarioLoteFormComponent } from '../horario-lote-form/horario-lote-form';
import { HorarioService } from '../../../services/horario.service';
import { LoteHorarioDto, ResultadoLote } from '../../../models/horario';
import { Cancha } from '../../../models/cancha';

/** Datos que necesita el diálogo: las opciones del selector de cancha. */
export interface DatosLoteDialog {
  canchas: Cancha[];
  /** Cancha elegida en la pantalla, que es la que propone el formulario. */
  canchaSeleccionada: number | null;
}

/**
 * Envuelve al formulario del lote en un diálogo de Material y se encarga de
 * generar.
 *
 * El request se hace acá y no en el listado, igual que en el alta de a uno: si
 * el backend rechaza el lote —un rango mal cargado, o un día que ya estaba
 * completo— el diálogo tiene que seguir abierto con lo que el usuario cargó. Se
 * cierra con el resultado, o con `undefined` si el usuario cancela.
 */
@Component({
  selector: 'app-horario-lote-dialog',
  imports: [MatDialogModule, HorarioLoteFormComponent],
  templateUrl: './horario-lote-dialog.html'
})
export class HorarioLoteDialogComponent {

  protected datos = inject<DatosLoteDialog>(MAT_DIALOG_DATA);

  private horarioService = inject(HorarioService);

  private dialogRef = inject(MatDialogRef<HorarioLoteDialogComponent, ResultadoLote>);

  /** Deshabilita los botones del formulario mientras el request está en curso. */
  protected readonly generando = signal(false);

  protected alGenerar(dto: LoteHorarioDto): void {
    this.generando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, el listado no se enteraría del lote.
    this.dialogRef.disableClose = true;

    this.horarioService.generar(dto).subscribe({
      next: (resultado) => this.dialogRef.close(resultado),
      // El mensaje de error ya lo mostró el interceptor; acá solo se devuelve el
      // control del formulario para que el usuario corrija y reintente.
      error: () => {
        this.generando.set(false);
        this.dialogRef.disableClose = false;
      }
    });
  }

  protected alCancelar(): void {
    this.dialogRef.close();
  }

}
