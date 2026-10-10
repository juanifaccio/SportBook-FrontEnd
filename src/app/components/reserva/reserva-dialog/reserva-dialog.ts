import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { catchError, map, of, switchMap } from 'rxjs';
import { ReservaService } from '../../../services/reserva.service';
import { EventoService } from '../../../services/evento.service';
import { AuthService } from '../../../core/services/auth.service';
import { Cancha } from '../../../models/cancha';
import { Equipamiento } from '../../../models/equipamiento';
import { EventoDto } from '../../../models/evento';
import { Horario } from '../../../models/horario';
import { TipoEvento } from '../../../models/tipo-evento';
import { Usuario } from '../../../models/usuario';
import { formatearFecha } from '../../../core/fechas';

export interface EventoDeclarado extends Omit<EventoDto, 'reservaId'> {
  tipoEvento: TipoEvento;
}

export interface EquipamientoElegido {
  equipamiento: Equipamiento;
  cantidad: number;
  subtotal: number;
}

export interface DatosReservaDialog {
  cancha: Cancha;
  horario: Horario;
  usuario: Usuario;
  precioTotal: number;
  evento: EventoDeclarado | null;
  equipamiento: EquipamientoElegido[];
}

export interface ResultadoReserva {
  eventoPendiente: boolean;
}

@Component({
  selector: 'app-reserva-dialog',
  imports: [CurrencyPipe, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './reserva-dialog.html',
  styleUrl: './reserva-dialog.css'
})
export class ReservaDialogComponent {

  protected datos = inject<DatosReservaDialog>(MAT_DIALOG_DATA);

  private reservaService = inject(ReservaService);

  private eventoService = inject(EventoService);

  private auth = inject(AuthService);

  private dialogRef = inject(MatDialogRef<ReservaDialogComponent, ResultadoReserva>);

  protected readonly guardando = signal(false);

  protected get fechaFormateada(): string {
    return formatearFecha(this.datos.horario.fecha);
  }

  protected confirmar(): void {
    this.guardando.set(true);
    this.dialogRef.disableClose = true;

    this.reservaService
      .crear({
        horarioId: this.datos.horario.id,
        ...(this.auth.esAdmin() ? { usuarioId: this.datos.usuario.id } : {}),
        ...(this.datos.equipamiento.length > 0
          ? {
              equipamientos: this.datos.equipamiento.map(({ equipamiento, cantidad }) => ({
                equipamientoId: equipamiento.id,
                cantidad: cantidad
              }))
            }
          : {})
      })
      .pipe(switchMap((reserva) => this.cargarEvento(reserva.id)))
      .subscribe({
        next: (resultado) => this.dialogRef.close(resultado),
        error: () => {
          this.guardando.set(false);
          this.dialogRef.disableClose = false;
        }
      });
  }

  private cargarEvento(reservaId: number) {
    const evento = this.datos.evento;

    if (!evento) {
      return of<ResultadoReserva>({ eventoPendiente: false });
    }

    return this.eventoService
      .crear({
        descripcion: evento.descripcion,
        cantidadPersonas: evento.cantidadPersonas,
        tipoEventoId: evento.tipoEventoId,
        reservaId: reservaId
      })
      .pipe(
        map((): ResultadoReserva => ({ eventoPendiente: false })),
        catchError(() => of<ResultadoReserva>({ eventoPendiente: true }))
      );
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

}
