import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ReservaService } from '../../../services/reserva.service';
import { HorarioService } from '../../../services/horario.service';
import { Cancha } from '../../../models/cancha';
import { Horario } from '../../../models/horario';
import { Reserva } from '../../../models/reserva';
import { BusquedaTurnos, ReprogramarFormComponent } from '../reprogramar-form/reprogramar-form';

export interface DatosReprogramarDialog {
  reserva: Reserva;
  canchas: Cancha[];
}

@Component({
  selector: 'app-reprogramar-dialog',
  imports: [MatDialogModule, ReprogramarFormComponent],
  templateUrl: './reprogramar-dialog.html'
})
export class ReprogramarDialogComponent {

  protected datos = inject<DatosReprogramarDialog>(MAT_DIALOG_DATA);

  private reservaService = inject(ReservaService);

  private horarioService = inject(HorarioService);

  private dialogRef = inject(MatDialogRef<ReprogramarDialogComponent, Reserva>);

  protected readonly turnos = signal<Horario[]>([]);
  protected readonly cargandoTurnos = signal(false);
  protected readonly errorTurnos = signal(false);

  protected readonly guardando = signal(false);

  constructor() {
    this.buscarTurnos({
      canchaId: this.datos.reserva.canchaId,
      fecha: this.datos.reserva.fecha
    });
  }

  protected buscarTurnos({ canchaId, fecha }: BusquedaTurnos): void {
    this.cargandoTurnos.set(true);
    this.errorTurnos.set(false);

    this.horarioService.listarDisponibles(canchaId, fecha).subscribe({
      next: (turnos) => {
        this.turnos.set(turnos);
        this.cargandoTurnos.set(false);
      },
      error: () => {
        this.turnos.set([]);
        this.errorTurnos.set(true);
        this.cargandoTurnos.set(false);
      }
    });
  }

  protected alGuardar(horarioId: number): void {
    this.guardando.set(true);
    this.dialogRef.disableClose = true;

    this.reservaService.reprogramar(this.datos.reserva.id, { horarioId: horarioId }).subscribe({
      next: (reprogramada) => this.dialogRef.close(reprogramada),
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
