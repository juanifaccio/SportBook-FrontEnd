import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { HorarioFormComponent } from '../horario-form/horario-form';
import { HorarioService } from '../../../services/horario.service';
import { Horario, HorarioDto } from '../../../models/horario';
import { Cancha } from '../../../models/cancha';

export interface DatosHorarioDialog {
  horario: Horario | null;
  canchas: Cancha[];
  canchaSeleccionada: number | null;
}

@Component({
  selector: 'app-horario-dialog',
  imports: [MatDialogModule, HorarioFormComponent],
  templateUrl: './horario-dialog.html'
})
export class HorarioDialogComponent {

  protected datos = inject<DatosHorarioDialog>(MAT_DIALOG_DATA);

  private horarioService = inject(HorarioService);

  private dialogRef = inject(MatDialogRef<HorarioDialogComponent, Horario>);

  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.datos.horario ? 'Editar horario' : 'Nuevo horario';
  }

  protected alGuardar(dto: HorarioDto): void {
    const horario = this.datos.horario;

    this.guardando.set(true);
    this.dialogRef.disableClose = true;

    const peticion = horario
      ? this.horarioService.actualizar(horario.id, dto)
      : this.horarioService.crear(dto);

    peticion.subscribe({
      next: (guardado) => this.dialogRef.close(guardado),
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
