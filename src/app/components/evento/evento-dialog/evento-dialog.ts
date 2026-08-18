import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { EventoFormComponent } from '../evento-form/evento-form';
import { EventoService } from '../../../services/evento.service';
import { Evento, EventoDto } from '../../../models/evento';
import { Reserva } from '../../../models/reserva';
import { TipoEvento } from '../../../models/tipo-evento';

/**
 * Lo que el listado le pasa al diálogo: el evento a editar (o `null` para dar de
 * alta) y las opciones de los dos selectores, que el listado ya tiene cargadas.
 */
export interface DatosEventoDialog {
  evento: Evento | null;
  reservas: Reserva[];
  tipos: TipoEvento[];
}

/**
 * Envuelve al formulario en un diálogo de Material y se encarga de guardar.
 *
 * El request se hace acá y no en el listado porque si el backend rechaza los
 * datos (una reserva que ya tiene evento, por ejemplo) el diálogo tiene que
 * seguir abierto con lo que el usuario había cargado. Se cierra con el evento ya
 * guardado, o con `undefined` si el usuario cancela.
 */
@Component({
  selector: 'app-evento-dialog',
  imports: [MatDialogModule, EventoFormComponent],
  templateUrl: './evento-dialog.html'
})
export class EventoDialogComponent {

  protected datos = inject<DatosEventoDialog>(MAT_DIALOG_DATA);

  private eventoService = inject(EventoService);

  private dialogRef = inject(MatDialogRef<EventoDialogComponent, Evento>);

  /** Deshabilita los botones del formulario mientras el request está en curso. */
  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.datos.evento ? 'Editar evento' : 'Nuevo evento';
  }

  protected alGuardar(dto: EventoDto): void {
    const evento = this.datos.evento;

    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, el listado no se enteraría del alta.
    this.dialogRef.disableClose = true;

    // Al editar se manda todo menos la reserva: el evento no se muda de reserva
    // y el backend ignora ese campo en el PUT.
    const peticion = evento
      ? this.eventoService.actualizar(evento.id, {
          descripcion: dto.descripcion,
          cantidadPersonas: dto.cantidadPersonas,
          tipoEventoId: dto.tipoEventoId
        })
      : this.eventoService.crear(dto);

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
