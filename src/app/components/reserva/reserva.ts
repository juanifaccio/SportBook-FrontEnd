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

/**
 * Pasa una hora "HH:mm" a minutos desde la medianoche, para poder restar dos
 * horas y saber cuánto dura el turno.
 */
const minutosDe = (hora: string): number => {
  const [horas, minutos] = hora.split(':').map(Number);

  return horas * 60 + minutos;
};

/** Redondea un importe a centavos, como lo hace el backend. */
const aCentavos = (importe: number): number => Math.round(importe * 100) / 100;

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

  /**
   * Un administrador reserva desde el mostrador para quien se lo pide, así que
   * elige a nombre de quién va. Un cliente reserva para sí mismo: el selector no
   * tendría a quién ofrecerle, y el backend le impone su propio usuario igual.
   */
  protected readonly esAdmin = this.auth.esAdmin;

  protected readonly canchas = signal<Cancha[]>([]);
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly turnos = signal<Horario[]>([]);
  protected readonly tiposEvento = signal<TipoEvento[]>([]);

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

  /** Precio por hora de la cancha por la duración del turno. */
  protected readonly precioTurno = computed(() => {
    const turno = this.turnoActual();
    const cancha = this.canchaActual();

    if (!turno || !cancha) {
      return 0;
    }

    const horas = (minutosDe(turno.horaFin) - minutosDe(turno.horaInicio)) / 60;

    return aCentavos(cancha.precioPorHora * horas);
  });

  /**
   * El turno más el equipamiento. Es solo el adelanto que ve el usuario antes de
   * confirmar: el precio que se guarda lo calcula el backend con los mismos
   * datos, porque un total que sale del navegador no se puede creer.
   */
  protected readonly precioTotal = computed(() =>
    this.equipamientoElegido().reduce(
      (total, elegido) => aCentavos(total + elegido.subtotal),
      this.precioTurno()
    )
  );

  /**
   * El equipamiento también es opcional y arranca plegado, como el evento: la
   * mayoría de los que reservan traen lo suyo.
   */
  protected readonly conEquipamiento = signal(false);

  /** El catálogo con las unidades que quedan libres durante el turno elegido. */
  protected readonly equipamientos = signal<Equipamiento[]>([]);
  protected readonly cargandoEquipamiento = signal(false);
  protected readonly errorEquipamiento = signal(false);

  /** Cuántas unidades de cada artículo se eligieron, por id. Los que no están, cero. */
  protected readonly cantidades = signal<Record<number, number>>({});

  /**
   * El pedido del equipamiento en curso. Se corta al pedir el de otro turno: si
   * el usuario cambia rápido de turno, la respuesta vieja llegaría después y
   * mostraría las unidades libres de un turno que ya no está elegido.
   */
  private pedidoEquipamiento?: Subscription;

  /** Lo que se va a alquilar, con su subtotal, en el orden del catálogo. */
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

  /**
   * Una reserva puede ser un partido y nada más, así que el evento es opcional y
   * arranca plegado: quien solo quiere la cancha no tiene que ver estos campos.
   */
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

  /**
   * Estado del formulario del evento como signal, para que `puedeReservar` se
   * recalcule cuando el usuario termina de completarlo.
   */
  private readonly estadoEvento = toSignal(this.eventoFormulario.statusChanges, {
    initialValue: this.eventoFormulario.status
  });

  protected readonly puedeReservar = computed(
    () =>
      this.turnoActual() !== undefined &&
      this.usuarioActual() !== undefined &&
      // Con el evento marcado pero incompleto se reservaría sin él y sin avisar:
      // o se completa, o se destilda.
      (!this.conEvento() || this.estadoEvento() === 'VALID') &&
      // Mientras llegan las unidades libres del turno, lo elegido puede no
      // alcanzar todavía: se espera a saberlo.
      !(this.conEquipamiento() && this.cargandoEquipamiento())
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

    const conectado = this.auth.usuario();

    forkJoin({
      canchas: this.canchaService.listar(),
      // El listado de usuarios es de administración: a un cliente el backend se
      // lo rechaza con un 403, y tampoco lo necesita. Para él la única opción es
      // él mismo, y así el resto de la pantalla funciona igual para los dos.
      usuarios: this.esAdmin()
        ? this.usuarioService.listar()
        : of(conectado ? [conectado] : []),
      // Los tipos de evento sí los puede consultar cualquier sesión: son el
      // catálogo con el que el cliente declara qué viene a hacer.
      tiposEvento: this.tipoEventoService.listar()
    }).subscribe({
      next: ({ canchas, usuarios, tiposEvento }) => {
        // Una cancha en mantenimiento no admite reservas y un usuario dado de
        // baja tampoco puede reservar: el backend los rechaza, así que ni
        // siquiera se ofrecen.
        const disponibles = canchas.filter((cancha) => cancha.estado === 'DISPONIBLE');
        const activos = usuarios.filter((usuario) => usuario.activo);

        this.canchas.set(disponibles);
        this.usuarios.set(activos);
        this.tiposEvento.set(tiposEvento);

        // El cliente no elige: su reserva va a su nombre, y sin esto el botón de
        // reservar quedaría deshabilitado para siempre.
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

    // Lo que queda libre depende del turno: con otro turno elegido, hay que
    // volver a preguntar.
    if (this.conEquipamiento()) {
      this.cargarEquipamiento();
    }
  }

  protected alElegirUsuario(usuarioId: number): void {
    this.usuarioSeleccionado.set(usuarioId);
  }

  protected alCambiarConEvento(marcado: boolean): void {
    this.conEvento.set(marcado);

    // Al destildarlo se limpia lo cargado: si se vuelve a marcar, el formulario
    // arranca en blanco en vez de traerse datos de un evento descartado.
    if (!marcado) {
      this.eventoFormulario.reset();
    }
  }

  protected alCambiarConEquipamiento(marcado: boolean): void {
    this.conEquipamiento.set(marcado);

    // Igual que con el evento: al destildarlo se descarta lo elegido.
    if (marcado) {
      this.cargarEquipamiento();
    } else {
      this.cantidades.set({});
    }
  }

  /** Cuántas unidades de un artículo hay elegidas. */
  protected cantidadDe(equipamiento: Equipamiento): number {
    return this.cantidades()[equipamiento.id] ?? 0;
  }

  /**
   * Suma o resta una unidad, sin bajar de cero ni pasar de lo que queda libre
   * en el turno. Los botones ya se deshabilitan en los dos topes; esto es para
   * que el estado no pueda quedar fuera de rango aunque se llame igual.
   */
  protected cambiarCantidad(equipamiento: Equipamiento, delta: number): void {
    const maximo = equipamiento.disponibles ?? 0;
    const cantidad = Math.min(maximo, Math.max(0, this.cantidadDe(equipamiento) + delta));

    this.cantidades.update((cantidades) => ({ ...cantidades, [equipamiento.id]: cantidad }));
  }

  /**
   * Las unidades libres de cada artículo durante el turno elegido. Sin turno no
   * hay nada que preguntar: la sección le pide al usuario que elija uno.
   */
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

  /**
   * Al cambiar de turno, lo elegido puede no alcanzar en el nuevo: se recorta a
   * lo que queda libre y se avisa, para que el total que cambia no sorprenda.
   */
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

  /** Turnos que quedan libres en la cancha y el día elegidos. */
  protected cargarTurnos(): void {
    const canchaId = this.canchaSeleccionada();

    if (canchaId === null) {
      return;
    }

    // Al cambiar de cancha o de día, el turno que estaba elegido ya no está en
    // la lista: dejarlo seleccionado reservaría uno que el usuario no ve. Lo
    // libre del equipamiento era de ese turno, así que se descarta también.
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

      // El turno reservado dejó de estar libre: se vuelven a pedir los del día
      // para que desaparezca de la lista.
      this.cargarTurnos();
    });
  }

  /**
   * El evento que se va a cargar junto con la reserva, o `null` si no se declaró
   * ninguno. Se lee del formulario en el momento de confirmar y no de un
   * `computed`, para que no pueda quedar con un valor viejo en caché.
   */
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
