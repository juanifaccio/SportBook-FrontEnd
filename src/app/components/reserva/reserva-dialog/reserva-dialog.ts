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

/**
 * El evento que se declaró al reservar. Va sin `reservaId` porque la reserva
 * todavía no existe: se completa con el id que devuelve el alta.
 */
export interface EventoDeclarado extends Omit<EventoDto, 'reservaId'> {
  /** Solo para mostrarlo en el resumen; el backend recibe el id. */
  tipoEvento: TipoEvento;
}

/**
 * Un artículo que se va a alquilar con la reserva. El artículo entero viaja para
 * nombrarlo en el resumen; al backend le llegan solo el id y la cantidad.
 */
export interface EquipamientoElegido {
  equipamiento: Equipamiento;
  cantidad: number;
  /** Calculado en la pantalla, solo para mostrarlo: el que vale es el del backend. */
  subtotal: number;
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
  /** Lo que se alquila con la reserva; vacío si es la cancha y nada más. */
  equipamiento: EquipamientoElegido[];
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
 * necesita el id de una reserva que todavía no existe. El equipamiento, en
 * cambio, va en el mismo request de la reserva: cambia el precio total, así que
 * el backend lo guarda junto con ella o no guarda nada.
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
        ...(this.auth.esAdmin() ? { usuarioId: this.datos.usuario.id } : {}),
        // Sin equipamiento no se manda el campo: es opcional para el backend.
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
