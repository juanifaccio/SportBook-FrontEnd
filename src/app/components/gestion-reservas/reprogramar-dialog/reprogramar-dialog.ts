import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ReservaService } from '../../../services/reserva.service';
import { HorarioService } from '../../../services/horario.service';
import { Cancha } from '../../../models/cancha';
import { Horario } from '../../../models/horario';
import { Reserva } from '../../../models/reserva';
import { BusquedaTurnos, ReprogramarFormComponent } from '../reprogramar-form/reprogramar-form';

/** Datos que necesita el diálogo: la reserva a mover y las opciones del selector. */
export interface DatosReprogramarDialog {
  reserva: Reserva;
  canchas: Cancha[];
}

/**
 * Envuelve al formulario de reprogramación y se encarga de los requests: buscar
 * los turnos libres y guardar el cambio.
 *
 * El `PUT` se hace acá y no en el listado porque si el backend lo rechaza
 * —alguien se adelantó y tomó ese turno— el diálogo tiene que seguir abierto
 * para que el usuario elija otro. Se cierra con la reserva ya reprogramada, o
 * con `undefined` si el usuario cancela.
 */
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

  /** Deshabilita los controles del formulario mientras el request está en curso. */
  protected readonly guardando = signal(false);

  constructor() {
    // Arranca mostrando los turnos libres de la cancha y el día que la reserva
    // ya tiene, que es donde el formulario se posiciona al abrirse.
    this.buscarTurnos({
      canchaId: this.datos.reserva.canchaId,
      fecha: this.datos.reserva.fecha
    });
  }

  /**
   * Turnos libres de una cancha en un día. El turno que la reserva ocupa hoy no
   * aparece —está marcado como no disponible—, y está bien que así sea: mover
   * una reserva al turno que ya tiene no es un cambio.
   */
  protected buscarTurnos({ canchaId, fecha }: BusquedaTurnos): void {
    this.cargandoTurnos.set(true);
    this.errorTurnos.set(false);

    this.horarioService.listarDisponibles(canchaId, fecha).subscribe({
      next: (turnos) => {
        this.turnos.set(turnos);
        this.cargandoTurnos.set(false);
      },
      // El mensaje al usuario ya lo muestra el interceptor; acá solo se refleja
      // el estado en la vista.
      error: () => {
        this.turnos.set([]);
        this.errorTurnos.set(true);
        this.cargandoTurnos.set(false);
      }
    });
  }

  protected alGuardar(horarioId: number): void {
    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, el listado no se enteraría del cambio
    // y seguiría mostrando la reserva en el turno viejo.
    this.dialogRef.disableClose = true;

    this.reservaService.reprogramar(this.datos.reserva.id, { horarioId: horarioId }).subscribe({
      next: (reprogramada) => this.dialogRef.close(reprogramada),
      // El mensaje de error ya lo mostró el interceptor; acá solo se devuelve el
      // control para que el usuario elija otro turno o reintente.
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
