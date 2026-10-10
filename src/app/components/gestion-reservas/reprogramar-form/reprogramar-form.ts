import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Cancha } from '../../../models/cancha';
import { Horario } from '../../../models/horario';
import { Reserva } from '../../../models/reserva';
import { aDate, aTexto, formatearFecha, hoyLocal } from '../../../core/fechas';

export interface BusquedaTurnos {
  canchaId: number;
  fecha: string;
}

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
    MatChipsModule,
    MatDatepickerModule
  ],
  templateUrl: './reprogramar-form.html',
  styleUrl: './reprogramar-form.css'
})
export class ReprogramarFormComponent {
  readonly reserva = input.required<Reserva>();

  readonly canchas = input<Cancha[]>([]);

  readonly turnos = input<Horario[]>([]);

  readonly cargandoTurnos = input(false);
  readonly errorTurnos = input(false);

  readonly guardando = input(false);

  readonly buscar = output<BusquedaTurnos>();
  readonly guardar = output<number>();
  readonly cancelar = output<void>();

  protected readonly hoy = hoyLocal();
  protected readonly minimo = aDate(this.hoy);

  protected readonly canchaSeleccionada = signal(0);
  protected readonly fecha = signal('');
  protected readonly turnoSeleccionado = signal<number | null>(null);

  protected readonly fechaElegida = computed(() => aDate(this.fecha()));

  protected readonly formatearFecha = formatearFecha;

  protected readonly canchaActual = computed(() =>
    this.canchas().find((cancha) => cancha.id === this.canchaSeleccionada())
  );

  constructor() {
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

  protected alCambiarFecha(fecha: Date | null): void {
    if (!fecha) {
      return;
    }

    this.fecha.set(aTexto(fecha));
    this.pedirTurnos();
  }

  protected alElegirTurno(turnoId: number | null): void {
    this.turnoSeleccionado.set(turnoId);
  }

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
