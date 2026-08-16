import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { forkJoin } from 'rxjs';
import { HorarioService } from '../../services/horario.service';
import { CanchaService } from '../../services/cancha.service';
import { UsuarioService } from '../../services/usuario.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Cancha } from '../../models/cancha';
import { Horario } from '../../models/horario';
import { Usuario } from '../../models/usuario';
import { aDate, aTexto, formatearFecha, hoyLocal } from '../../core/fechas';
import { DatosReservaDialog, ReservaDialogComponent } from './reserva-dialog/reserva-dialog';

/**
 * Pasa una hora "HH:mm" a minutos desde la medianoche, para poder restar dos
 * horas y saber cuánto dura el turno.
 */
const minutosDe = (hora: string): number => {
  const [horas, minutos] = hora.split(':').map(Number);

  return horas * 60 + minutos;
};

/**
 * Pantalla del caso de uso central: reservar una cancha.
 *
 * Todo pasa en una sola vista. Se elige cancha y día, aparecen los turnos que
 * quedan libres ese día, se elige uno y a nombre de quién va, y el diálogo de
 * confirmación muestra el resumen antes de mandarlo al backend.
 */
@Component({
  selector: 'app-reserva',
  imports: [
    RouterLink,
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatDatepickerModule
  ],
  templateUrl: './reserva.html',
  styleUrl: './reserva.css'
})
export class ReservaComponent implements OnInit {

  private canchaService = inject(CanchaService);
  private horarioService = inject(HorarioService);
  private usuarioService = inject(UsuarioService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);

  protected readonly canchas = signal<Cancha[]>([]);
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly turnos = signal<Horario[]>([]);

  protected readonly canchaSeleccionada = signal<number | null>(null);
  protected readonly turnoSeleccionado = signal<number | null>(null);
  protected readonly usuarioSeleccionado = signal<number | null>(null);

  /** Fecha mínima del calendario: no tiene sentido reservar un día que ya pasó. */
  protected readonly hoy = hoyLocal();
  protected readonly minimo = aDate(this.hoy);
  protected readonly fecha = signal(this.hoy);

  /** El día elegido, como `Date`, que es lo que entiende el calendario. */
  protected readonly fechaElegida = computed(() => aDate(this.fecha()));

  protected readonly cargando = signal(false);
  protected readonly error = signal(false);
  protected readonly cargandoTurnos = signal(false);
  protected readonly errorTurnos = signal(false);

  /** Sin canchas o sin usuarios no hay reserva posible. */
  protected readonly hayCanchas = computed(() => this.canchas().length > 0);
  protected readonly hayUsuarios = computed(() => this.usuarios().length > 0);

  protected readonly canchaActual = computed(() =>
    this.canchas().find((cancha) => cancha.id === this.canchaSeleccionada())
  );

  protected readonly turnoActual = computed(() =>
    this.turnos().find((turno) => turno.id === this.turnoSeleccionado())
  );

  protected readonly usuarioActual = computed(() =>
    this.usuarios().find((usuario) => usuario.id === this.usuarioSeleccionado())
  );

  /**
   * Precio por hora de la cancha por la duración del turno. Es solo el adelanto
   * que ve el usuario antes de confirmar: el precio que se guarda lo calcula el
   * backend con los mismos datos, porque un total que sale del navegador no se
   * puede creer.
   */
  protected readonly precioTotal = computed(() => {
    const turno = this.turnoActual();
    const cancha = this.canchaActual();

    if (!turno || !cancha) {
      return 0;
    }

    const horas = (minutosDe(turno.horaFin) - minutosDe(turno.horaInicio)) / 60;

    return cancha.precioPorHora * horas;
  });

  protected readonly puedeReservar = computed(
    () => this.turnoActual() !== undefined && this.usuarioActual() !== undefined
  );

  ngOnInit(): void {
    this.cargar();
  }

  /**
   * Carga inicial: las canchas y los usuarios entre los que se puede elegir.
   * Los turnos se piden después, cuando ya se sabe qué cancha quedó elegida.
   */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    forkJoin({
      canchas: this.canchaService.listar(),
      usuarios: this.usuarioService.listar()
    }).subscribe({
      next: ({ canchas, usuarios }) => {
        // Una cancha en mantenimiento no admite reservas y un usuario dado de
        // baja tampoco puede reservar: el backend los rechaza, así que ni
        // siquiera se ofrecen.
        const disponibles = canchas.filter((cancha) => cancha.estado === 'DISPONIBLE');

        this.canchas.set(disponibles);
        this.usuarios.set(usuarios.filter((usuario) => usuario.activo));

        const primera = disponibles[0];

        if (!primera) {
          this.cargando.set(false);
          return;
        }

        this.canchaSeleccionada.set(primera.id);
        this.cargando.set(false);
        this.cargarTurnos();
      },
      // El mensaje al usuario ya lo muestra el interceptor; acá solo se refleja
      // el estado en la vista para poder ofrecer un reintento.
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  protected alCambiarCancha(canchaId: number): void {
    this.canchaSeleccionada.set(canchaId);
    this.cargarTurnos();
  }

  protected alCambiarFecha(fecha: Date | null): void {
    // El campo se puede vaciar o escribir mal a mano; sin día válido no hay
    // turnos que pedir.
    if (!fecha) {
      return;
    }

    this.fecha.set(aTexto(fecha));
    this.cargarTurnos();
  }

  protected alElegirTurno(turnoId: number | null): void {
    this.turnoSeleccionado.set(turnoId);
  }

  protected alElegirUsuario(usuarioId: number): void {
    this.usuarioSeleccionado.set(usuarioId);
  }

  /** Turnos que quedan libres en la cancha y el día elegidos. */
  protected cargarTurnos(): void {
    const canchaId = this.canchaSeleccionada();

    if (canchaId === null) {
      return;
    }

    // Al cambiar de cancha o de día, el turno que estaba elegido ya no está en
    // la lista: dejarlo seleccionado reservaría uno que el usuario no ve.
    this.turnoSeleccionado.set(null);
    this.cargandoTurnos.set(true);
    this.errorTurnos.set(false);

    this.horarioService.listarDisponibles(canchaId, this.fecha()).subscribe({
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

  /** La fecha viaja como "AAAA-MM-DD" y se muestra como "DD/MM/AAAA". */
  protected readonly formatearFecha = formatearFecha;

  /**
   * El request lo hace el diálogo, que se cierra recién cuando el backend
   * confirma. Acá solo se refleja el resultado.
   */
  protected confirmarReserva(): void {
    const cancha = this.canchaActual();
    const horario = this.turnoActual();
    const usuario = this.usuarioActual();

    if (!cancha || !horario || !usuario) {
      return;
    }

    const datos: DatosReservaDialog = {
      cancha: cancha,
      horario: horario,
      usuario: usuario,
      precioTotal: this.precioTotal()
    };

    const dialogRef = this.dialog.open<ReservaDialogComponent, DatosReservaDialog, boolean>(
      ReservaDialogComponent,
      { data: datos, width: '32rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((reservado) => {
      if (!reservado) {
        return;
      }

      this.notificacion.exito('Reserva confirmada correctamente.');

      // El turno reservado dejó de estar libre: se vuelven a pedir los del día
      // para que desaparezca de la lista.
      this.cargarTurnos();
    });
  }

}
