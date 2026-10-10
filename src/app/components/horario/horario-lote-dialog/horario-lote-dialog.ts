import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { HorarioLoteFormComponent } from '../horario-lote-form/horario-lote-form';
import { HorarioService } from '../../../services/horario.service';
import { LoteHorarioDto, ResultadoLote } from '../../../models/horario';
import { Cancha } from '../../../models/cancha';

export interface DatosLoteDialog {
  canchas: Cancha[];
  canchaSeleccionada: number | null;
}

@Component({
  selector: 'app-horario-lote-dialog',
  imports: [MatDialogModule, HorarioLoteFormComponent],
  templateUrl: './horario-lote-dialog.html'
})
export class HorarioLoteDialogComponent {

  protected datos = inject<DatosLoteDialog>(MAT_DIALOG_DATA);

  private horarioService = inject(HorarioService);

  private dialogRef = inject(MatDialogRef<HorarioLoteDialogComponent, ResultadoLote>);

  protected readonly generando = signal(false);

  protected alGenerar(dto: LoteHorarioDto): void {
    this.generando.set(true);
    this.dialogRef.disableClose = true;

    this.horarioService.generar(dto).subscribe({
      next: (resultado) => this.dialogRef.close(resultado),
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
