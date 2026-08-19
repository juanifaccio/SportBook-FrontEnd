import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { map } from 'rxjs';
import { HorarioService } from '../../services/horario.service';
import { CanchaService } from '../../services/cancha.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Horario, ResultadoLote } from '../../models/horario';
import { Cancha } from '../../models/cancha';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { formatearFecha } from '../../core/fechas';
import { DatosHorarioDialog, HorarioDialogComponent } from './horario-dialog/horario-dialog';
import {
  DatosLoteDialog,
  HorarioLoteDialogComponent
} from './horario-lote-dialog/horario-lote-dialog';
import {
  ConfirmacionComponent,
  DatosConfirmacion
} from '../shared/confirmacion/confirmacion';

/**
 * Pantalla de ABM de horarios.
 *
 * Los turnos no son un catálogo global: son de una cancha, así que la pantalla
 * arranca eligiendo una y muestra los suyos. Cambiar de cancha vuelve a pedirle
 * al backend solo los turnos de esa.
 */
@Component({
  selector: 'app-horario',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './horario.html',
  styleUrl: './horario.css'
})
export class HorarioComponent implements OnInit {

  private horarioService = inject(HorarioService);
  private canchaService = inject(CanchaService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly horarios = signal<Horario[]>([]);
  protected readonly canchas = signal<Cancha[]>([]);
  protected readonly canchaSeleccionada = signal<number | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  /** Sin canchas cargadas no hay turnos que administrar. */
  protected readonly hayCanchas = computed(() => this.canchas().length > 0);

  /** En mobile se muestran tarjetas apiladas; desde MD, una tabla. */
  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = ['fecha', 'horario', 'estado', 'acciones'];

  ngOnInit(): void {
    this.cargar();
  }

  /**
   * Carga inicial: primero las canchas, porque hasta no saber cuál está elegida
   * no hay turnos que pedir.
   */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    this.canchaService.listar().subscribe({
      next: (canchas) => {
        this.canchas.set(canchas);

        const primera = canchas[0];

        if (!primera) {
          this.cargando.set(false);
          return;
        }

        this.canchaSeleccionada.set(primera.id);
        this.cargarHorarios();
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
    this.cargarHorarios();
  }

  private cargarHorarios(): void {
    const canchaId = this.canchaSeleccionada();

    if (canchaId === null) {
      return;
    }

    this.cargando.set(true);
    this.error.set(false);

    this.horarioService.listar(canchaId).subscribe({
      next: (horarios) => {
        this.horarios.set(horarios);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  /** La fecha viaja como "AAAA-MM-DD" y se muestra como "DD/MM/AAAA". */
  protected readonly formatearFecha = formatearFecha;

  protected abrirAlta(): void {
    this.abrirFormulario(null);
  }

  protected abrirEdicion(horario: Horario): void {
    this.abrirFormulario(horario);
  }

  /**
   * El alta y la edición las resuelve el diálogo, que se cierra recién cuando el
   * backend confirma. Acá solo se refleja en la lista lo que ya quedó guardado.
   */
  private abrirFormulario(horario: Horario | null): void {
    const dialogRef = this.dialog.open<HorarioDialogComponent, DatosHorarioDialog, Horario>(
      HorarioDialogComponent,
      {
        data: {
          horario: horario,
          canchas: this.canchas(),
          canchaSeleccionada: this.canchaSeleccionada()
        },
        width: '32rem',
        maxWidth: '95vw'
      }
    );

    dialogRef.afterClosed().subscribe((guardado) => {
      if (!guardado) {
        return;
      }

      this.notificacion.exito(
        horario ? 'Horario actualizado correctamente.' : 'Horario creado correctamente.'
      );

      // El turno guardado puede haber quedado en otra cancha, y entonces ya no
      // pertenece a la lista que se está mostrando: se recarga la de la cancha
      // elegida en vez de tocar la lista en memoria.
      this.cargarHorarios();
    });
  }

  /**
   * Genera de una vez todos los turnos de un día. Es la misma alta repetida:
   * llenar un día de a uno son doce formularios idénticos salvo por la hora.
   */
  protected abrirGeneracion(): void {
    const dialogRef = this.dialog.open<
      HorarioLoteDialogComponent,
      DatosLoteDialog,
      ResultadoLote
    >(HorarioLoteDialogComponent, {
      data: {
        canchas: this.canchas(),
        canchaSeleccionada: this.canchaSeleccionada()
      },
      width: '32rem',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (!resultado) {
        return;
      }

      this.notificacion.exito(this.resumenDelLote(resultado));

      // El lote puede haber caído en otra cancha, y entonces sus turnos no
      // pertenecen a la lista que se está mostrando: se recarga la de la cancha
      // elegida en vez de tocar la lista en memoria.
      this.cargarHorarios();
    });
  }

  /**
   * Cuántos turnos se crearon y cuántos ya estaban.
   *
   * Los salteados se nombran solo cuando los hubo: aclarar que ya estaban cero
   * es ruido, y el caso normal es el día vacío.
   */
  private resumenDelLote({ creados, omitidos }: ResultadoLote): string {
    const turnos = `${creados.length} ${creados.length === 1 ? 'turno' : 'turnos'}`;

    if (omitidos === 0) {
      return `Se generaron ${turnos}.`;
    }

    const yaEstaban =
      omitidos === 1 ? 'Otro ya estaba cargado' : `Otros ${omitidos} ya estaban cargados`;

    return `Se generaron ${turnos}. ${yaEstaban}.`;
  }

  protected confirmarEliminacion(horario: Horario): void {
    const datos: DatosConfirmacion = {
      titulo: 'Eliminar horario',
      mensaje: `¿Seguro que querés eliminar el turno del ${this.formatearFecha(horario.fecha)} de ${horario.horaInicio} a ${horario.horaFin}? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar'
    };

    const dialogRef = this.dialog.open<ConfirmacionComponent, DatosConfirmacion, boolean>(
      ConfirmacionComponent,
      { data: datos, width: '28rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.eliminar(horario.id);
      }
    });
  }

  private eliminar(id: number): void {
    this.horarioService.eliminar(id).subscribe({
      next: () => {
        this.horarios.update((horarios) => horarios.filter((horario) => horario.id !== id));
        this.notificacion.exito('Horario eliminado correctamente.');
      }
    });
  }

}
