import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Subscription, forkJoin, of } from 'rxjs';
import { HorarioService } from '../../services/horario.service';
import { CanchaService } from '../../services/cancha.service';
import { UsuarioService } from '../../services/usuario.service';
import { TipoEventoService } from '../../services/tipo-evento.service';
import { EquipamientoService } from '../../services/equipamiento.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Cancha } from '../../models/cancha';
import { Equipamiento } from '../../models/equipamiento';
import { Horario } from '../../models/horario';
import { TipoEvento } from '../../models/tipo-evento';
import { Usuario } from '../../models/usuario';
import { aDate, aTexto, formatearFecha, hoyLocal } from '../../core/fechas';
import { entero } from '../../core/validadores';
import {
  DatosReservaDialog,
  EquipamientoElegido,
  EventoDeclarado,
  ReservaDialogComponent,
  ResultadoReserva
} from './reserva-dialog/reserva-dialog';

const minutosDe = (hora: string): number => {
  const [horas, minutos] = hora.split(':').map(Number);

  return horas * 60 + minutos;
};

const aCentavos = (importe: number): number => Math.round(importe * 100) / 100;

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
    MatCheckboxModule,
    MatDatepickerModule,
    ReactiveFormsModule
  ],
  templateUrl: './reserva.html',
  styleUrl: './reserva.css'
})
export class ReservaComponent implements OnInit {

  private canchaService = inject(CanchaService);
  private horarioService = inject(HorarioService);
  private usuarioService = inject(UsuarioService);
  private tipoEventoService = inject(TipoEventoService);
  private equipamientoService = inject(EquipamientoService);
  private auth = inject(AuthService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);

  protected readonly esAdmin = this.auth.esAdmin;

  protected readonly canchas = signal<Cancha[]>([]);
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly turnos = signal<Horario[]>([]);
  protected readonly tiposEvento = signal<TipoEvento[]>([]);

  protected readonly canchaSeleccionada = signal<number | null>(null);
  protected readonly turnoSeleccionado = signal<number | null>(null);
  protected readonly usuarioSeleccionado = signal<number | null>(null);

  protected readonly hoy = hoyLocal();
  protected readonly minimo = aDate(this.hoy);
  protected readonly fecha = signal(this.hoy);

  protected readonly fechaElegida = computed(() => aDate(this.fecha()));

  protected readonly cargando = signal(false);
  protected readonly error = signal(false);
  protected readonly cargandoTurnos = signal(false);
  protected readonly errorTurnos = signal(false);

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

  protected readonly precioTurno = computed(() => {
    const turno = this.turnoActual();
    const cancha = this.canchaActual();

    if (!turno || !cancha) {
      return 0;
    }

    const horas = (minutosDe(turno.horaFin) - minutosDe(turno.horaInicio)) / 60;

    return aCentavos(cancha.precioPorHora * horas);
  });

  protected readonly precioTotal = computed(() =>
    this.equipamientoElegido().reduce(
      (total, elegido) => aCentavos(total + elegido.subtotal),
      this.precioTurno()
    )
  );

  protected readonly conEquipamiento = signal(false);

  protected readonly equipamientos = signal<Equipamiento[]>([]);
  protected readonly cargandoEquipamiento = signal(false);
  protected readonly errorEquipamiento = signal(false);

  protected readonly cantidades = signal<Record<number, number>>({});

  private pedidoEquipamiento?: Subscription;

  protected readonly equipamientoElegido = computed((): EquipamientoElegido[] => {
    if (!this.conEquipamiento()) {
      return [];
    }

    const cantidades = this.cantidades();

    return this.equipamientos()
      .filter((equipamiento) => (cantidades[equipamiento.id] ?? 0) > 0)
      .map((equipamiento) => ({
        equipamiento: equipamiento,
        cantidad: cantidades[equipamiento.id],
        subtotal: aCentavos(equipamiento.precio * cantidades[equipamiento.id])
      }));
  });

  protected readonly conEvento = signal(false);

  protected readonly hayTiposEvento = computed(() => this.tiposEvento().length > 0);

  protected eventoFormulario = this.fb.group({
    tipoEventoId: this.fb.control<number | null>(null, Validators.required),
    descripcion: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(255)
    ]),
    cantidadPersonas: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      entero
    ])
  });

  private readonly estadoEvento = toSignal(this.eventoFormulario.statusChanges, {
    initialValue: this.eventoFormulario.status
  });

  protected readonly puedeReservar = computed(
    () =>
      this.turnoActual() !== undefined &&
      this.usuarioActual() !== undefined &&
      (!this.conEvento() || this.estadoEvento() === 'VALID') &&
      !(this.conEquipamiento() && this.cargandoEquipamiento())
  );

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    const conectado = this.auth.usuario();

    forkJoin({
      canchas: this.canchaService.listar(),
      usuarios: this.esAdmin()
        ? this.usuarioService.listar()
        : of(conectado ? [conectado] : []),
      tiposEvento: this.tipoEventoService.listar()
    }).subscribe({
      next: ({ canchas, usuarios, tiposEvento }) => {
        const disponibles = canchas.filter((cancha) => cancha.estado === 'DISPONIBLE');
        const activos = usuarios.filter((usuario) => usuario.activo);

        this.canchas.set(disponibles);
        this.usuarios.set(activos);
        this.tiposEvento.set(tiposEvento);

        if (!this.esAdmin()) {
          this.usuarioSeleccionado.set(activos[0]?.id ?? null);
        }

        const primera = disponibles[0];

        if (!primera) {
          this.cargando.set(false);
          return;
        }

        this.canchaSeleccionada.set(primera.id);
        this.cargando.set(false);
        this.cargarTurnos();
      },
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
    if (!fecha) {
      return;
    }

    this.fecha.set(aTexto(fecha));
    this.cargarTurnos();
  }

  protected alElegirTurno(turnoId: number | null): void {
    this.turnoSeleccionado.set(turnoId);

    if (this.conEquipamiento()) {
      this.cargarEquipamiento();
    }
  }

  protected alElegirUsuario(usuarioId: number): void {
    this.usuarioSeleccionado.set(usuarioId);
  }

  protected alCambiarConEvento(marcado: boolean): void {
    this.conEvento.set(marcado);

    if (!marcado) {
      this.eventoFormulario.reset();
    }
  }

  protected alCambiarConEquipamiento(marcado: boolean): void {
    this.conEquipamiento.set(marcado);

    if (marcado) {
      this.cargarEquipamiento();
    } else {
      this.cantidades.set({});
    }
  }

  protected cantidadDe(equipamiento: Equipamiento): number {
    return this.cantidades()[equipamiento.id] ?? 0;
  }

  protected cambiarCantidad(equipamiento: Equipamiento, delta: number): void {
    const maximo = equipamiento.disponibles ?? 0;
    const cantidad = Math.min(maximo, Math.max(0, this.cantidadDe(equipamiento) + delta));

    this.cantidades.update((cantidades) => ({ ...cantidades, [equipamiento.id]: cantidad }));
  }

  protected cargarEquipamiento(): void {
    this.pedidoEquipamiento?.unsubscribe();

    const turnoId = this.turnoSeleccionado();

    if (turnoId === null) {
      this.equipamientos.set([]);
      this.cargandoEquipamiento.set(false);
      return;
    }

    this.cargandoEquipamiento.set(true);
    this.errorEquipamiento.set(false);

    this.pedidoEquipamiento = this.equipamientoService.listar(turnoId).subscribe({
      next: (equipamientos) => {
        this.equipamientos.set(equipamientos);
        this.ajustarCantidades(equipamientos);
        this.cargandoEquipamiento.set(false);
      },
      error: () => {
        this.equipamientos.set([]);
        this.errorEquipamiento.set(true);
        this.cargandoEquipamiento.set(false);
      }
    });
  }

  private ajustarCantidades(equipamientos: Equipamiento[]): void {
    let recortado = false;
    const ajustadas: Record<number, number> = {};

    for (const equipamiento of equipamientos) {
      const elegida = this.cantidadDe(equipamiento);
      const permitida = Math.min(elegida, equipamiento.disponibles ?? 0);

      recortado ||= permitida < elegida;
      ajustadas[equipamiento.id] = permitida;
    }

    this.cantidades.set(ajustadas);

    if (recortado) {
      this.notificacion.error('Algunas cantidades se ajustaron a lo que queda libre en ese turno.');
    }
  }

  protected cargarTurnos(): void {
    const canchaId = this.canchaSeleccionada();

    if (canchaId === null) {
      return;
    }

    this.turnoSeleccionado.set(null);
    this.pedidoEquipamiento?.unsubscribe();
    this.equipamientos.set([]);
    this.cargandoEquipamiento.set(false);
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

  protected readonly formatearFecha = formatearFecha;

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
      precioTotal: this.precioTotal(),
      evento: this.eventoDeclarado(),
      equipamiento: this.equipamientoElegido()
    };

    const dialogRef = this.dialog.open<
      ReservaDialogComponent,
      DatosReservaDialog,
      ResultadoReserva
    >(ReservaDialogComponent, { data: datos, width: '32rem', maxWidth: '95vw' });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (!resultado) {
        return;
      }

      if (resultado.eventoPendiente) {
        this.notificacion.error(
          'La reserva se confirmó, pero el evento no se pudo guardar. Cargalo desde Eventos.'
        );
      } else {
        this.notificacion.exito('Reserva confirmada correctamente.');
      }

      this.alCambiarConEvento(false);
      this.alCambiarConEquipamiento(false);

      this.cargarTurnos();
    });
  }

  private eventoDeclarado(): EventoDeclarado | null {
    if (!this.conEvento() || this.eventoFormulario.invalid) {
      return null;
    }

    const { tipoEventoId, descripcion, cantidadPersonas } =
      this.eventoFormulario.getRawValue();

    const tipoEvento = this.tiposEvento().find((tipo) => tipo.id === tipoEventoId);

    if (!tipoEvento) {
      return null;
    }

    return {
      tipoEventoId: tipoEvento.id,
      tipoEvento: tipoEvento,
      descripcion: descripcion.trim(),
      cantidadPersonas: Number(cantidadPersonas)
    };
  }

}
