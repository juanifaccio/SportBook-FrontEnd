import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { Cancha } from '../../../models/cancha';
import { Horario } from '../../../models/horario';
import { Reserva } from '../../../models/reserva';
import { formatearFecha, hoyLocal } from '../../../core/fechas';

/** Cancha y día sobre los que hay que buscar turnos libres. */
export interface BusquedaTurnos {
  canchaId: number;
  fecha: string;
}

/**
 * Elige el turno nuevo de una reserva.
 *
 * Es un componente presentacional: no conoce el servicio ni el backend. Recibe
 * las canchas y los turnos ya cargados, y avisa por `buscar` cuando hay que
 * pedir los de otra cancha u otro día. Quien lo hospeda decide cómo
 * conseguirlos.
 *
 * No reutiliza la pantalla de `/reservar` aunque el selector se parezca: aquella
 * elige además el usuario y da de alta, y ésta solo mueve una reserva que ya
 * existe.
 */
@Component({
  selector: 'app-reprogramar-form',
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule
  ],
  templateUrl: './reprogramar-form.html',
  styleUrl: './reprogramar-form.css'
})
export class ReprogramarFormComponent {

  /** Reserva que se está moviendo; de ella salen la cancha y el día iniciales. */
  readonly reserva = input.required<Reserva>();

  /** Opciones del selector de cancha. */
  readonly canchas = input<Cancha[]>([]);

  /** Turnos libres de la cancha y el día elegidos. */
  readonly turnos = input<Horario[]>([]);

  readonly cargandoTurnos = input(false);
  readonly errorTurnos = input(false);

  /** Deshabilita los controles mientras el request está en curso. */
  readonly guardando = input(false);

  readonly buscar = output<BusquedaTurnos>();
  readonly guardar = output<number>();
  readonly cancelar = output<void>();

  /** Día mínimo del selector: no tiene sentido mover una reserva al pasado. */
  protected readonly hoy = hoyLocal();

  protected readonly canchaSeleccionada = signal(0);
  protected readonly fecha = signal('');
  protected readonly turnoSeleccionado = signal<number | null>(null);

  protected readonly formatearFecha = formatearFecha;

  protected readonly canchaActual = computed(() =>
    this.canchas().find((cancha) => cancha.id === this.canchaSeleccionada())
  );

  constructor() {
    // Al abrirse, el formulario arranca en la cancha y el día que la reserva ya
    // tiene: lo más habitual es correrla unas horas, no mudarla de complejo.
    effect(() => {
      const reserva = this.reserva();

      this.canchaSeleccionada.set(reserva.canchaId);
      this.fecha.set(reserva.fecha);
      this.turnoSeleccionado.set(null);
    });
  }

  protected alCambiarCancha(canchaId: number): void {
    this.canchaSeleccionada.set(canchaId);
    this.pedirTurnos();
  }

  protected alCambiarFecha(fecha: string): void {
    // El campo se puede vaciar a mano; sin día no hay turnos que pedir.
    if (!fecha) {
      return;
    }

    this.fecha.set(fecha);
    this.pedirTurnos();
  }

  protected alElegirTurno(turnoId: number | null): void {
    this.turnoSeleccionado.set(turnoId);
  }

  /**
   * Al cambiar de cancha o de día, el turno que estaba elegido ya no está en la
   * lista: dejarlo seleccionado movería la reserva a uno que el usuario no ve.
   */
  private pedirTurnos(): void {
    this.turnoSeleccionado.set(null);

    this.buscar.emit({
      canchaId: this.canchaSeleccionada(),
      fecha: this.fecha()
    });
  }

  protected alEnviar(): void {
    const turno = this.turnoSeleccionado();

    if (turno === null) {
      return;
    }

    this.guardar.emit(turno);
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
