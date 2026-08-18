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
import { EventoDto } from '../../../models/evento';
import { Horario } from '../../../models/horario';
import { TipoEvento } from '../../../models/tipo-evento';
import { Usuario } from '../../../models/usuario';
import { formatearFecha } from '../../../core/fechas';

/**
 * El evento que se declaró al reservar. Va sin `reservaId` porque la reserva
 * todavía no existe: se completa con el id que devuelve el alta.
 */
export interface EventoDeclarado extends Omit<EventoDto, 'reservaId'> {
  /** Solo para mostrarlo en el resumen; el backend recibe el id. */
  tipoEvento: TipoEvento;
}

/** Lo que hay que mostrar en el resumen antes de confirmar. */
export interface DatosReservaDialog {
  cancha: Cancha;
  horario: Horario;
  usuario: Usuario;
  /** Total calculado en la pantalla, solo para mostrarlo. */
  precioTotal: number;
  /** El evento a cargarle a la reserva, si se declaró uno. */
  evento: EventoDeclarado | null;
}

/**
 * Cómo terminó la confirmación.
 *
 * No alcanza con un booleano: la reserva puede quedar hecha y el evento no, y la
 * pantalla tiene que poder decirlo.
 */
export interface ResultadoReserva {
  eventoPendiente: boolean;
}

/**
 * Resumen de la reserva y confirmación.
 *
 * El request se hace acá y no en la pantalla porque si el backend lo rechaza
 * (alguien se adelantó y tomó el turno, por ejemplo) el diálogo tiene que seguir
 * abierto para que el usuario decida qué hacer. Se cierra con el resultado
 * cuando la reserva quedó guardada, y con `undefined` si se cancela.
 *
 * Si además se declaró un evento son dos requests encadenados, porque el evento
 * necesita el id de una reserva que todavía no existe.
 *
 * No reutiliza `ConfirmacionComponent`: ese es genérico para acciones
 * destructivas y no hace requests.
 */
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

  /** Deshabilita los botones mientras el request está en curso. */
  protected readonly guardando = signal(false);

  /** La fecha viaja como "AAAA-MM-DD" y se muestra como "DD/MM/AAAA". */
  protected get fechaFormateada(): string {
    return formatearFecha(this.datos.horario.fecha);
  }

  protected confirmar(): void {
    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, la pantalla no se enteraría de la
    // reserva y seguiría mostrando el turno como libre.
    this.dialogRef.disableClose = true;

    this.reservaService
      .crear({
        horarioId: this.datos.horario.id,
        // Solo el administrador reserva a nombre de otro. Para el cliente el
        // dueño sale de su sesión en el backend, así que mandarlo sería sugerir
        // que puede elegirlo.
        ...(this.auth.esAdmin() ? { usuarioId: this.datos.usuario.id } : {})
      })
      .pipe(switchMap((reserva) => this.cargarEvento(reserva.id)))
      .subscribe({
        next: (resultado) => this.dialogRef.close(resultado),
        // El mensaje de error ya lo mostró el interceptor; acá solo se devuelve
        // el control para que el usuario elija otro turno o reintente. Solo llega
        // acá si falló la reserva: el evento se resuelve adentro de `cargarEvento`.
        error: () => {
          this.guardando.set(false);
          this.dialogRef.disableClose = false;
        }
      });
  }

  /**
   * Segundo request: el evento de la reserva recién creada.
   *
   * Si falla, el diálogo se cierra igual. La reserva ya está hecha y volver a
   * confirmar la duplicaría —el turno además ya no está libre—, así que en vez de
   * reintentar se avisa que el evento quedó pendiente y se lo puede cargar
   * después desde la pantalla de eventos.
   */
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
