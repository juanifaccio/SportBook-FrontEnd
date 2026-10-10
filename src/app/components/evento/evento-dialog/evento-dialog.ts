import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { EventoFormComponent } from '../evento-form/evento-form';
import { EventoService } from '../../../services/evento.service';
import { Evento, EventoDto } from '../../../models/evento';
import { Reserva } from '../../../models/reserva';
import { TipoEvento } from '../../../models/tipo-evento';

export interface DatosEventoDialog {
  evento: Evento | null;
  reservas: Reserva[];
  tipos: TipoEvento[];
}

@Component({
  selector: 'app-evento-dialog',
  imports: [MatDialogModule, EventoFormComponent],
  templateUrl: './evento-dialog.html'
})
export class EventoDialogComponent {

  protected datos = inject<DatosEventoDialog>(MAT_DIALOG_DATA);

  private eventoService = inject(EventoService);

  private dialogRef = inject(MatDialogRef<EventoDialogComponent, Evento>);

  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.datos.evento ? 'Editar evento' : 'Nuevo evento';
  }

  protected alGuardar(dto: EventoDto): void {
    const evento = this.datos.evento;

    this.guardando.set(true);
    this.dialogRef.disableClose = true;

    const peticion = evento
      ? this.eventoService.actualizar(evento.id, {
          descripcion: dto.descripcion,
          cantidadPersonas: dto.cantidadPersonas,
          tipoEventoId: dto.tipoEventoId
        })
      : this.eventoService.crear(dto);

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
