import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
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
import { forkJoin, map } from 'rxjs';
import { CanchaService } from '../../services/cancha.service';
import { TipoCanchaService } from '../../services/tipo-cancha.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Cancha, CanchaDto, EstadoCancha, ETIQUETAS_ESTADO } from '../../models/cancha';
import { TipoCancha } from '../../models/tipo-cancha';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { CanchaDialogComponent, DatosCanchaDialog } from './cancha-dialog/cancha-dialog';
import {
  ConfirmacionComponent,
  DatosConfirmacion
} from '../shared/confirmacion/confirmacion';

/**
 * Pantalla de ABM de canchas.
 *
 * Es el primer CRUD dependiente del proyecto: además de las canchas carga los
 * tipos de cancha, porque el formulario necesita ofrecerlos en un selector. Los
 * pide acá y no en el formulario para que ese siga siendo presentacional.
 */
@Component({
  selector: 'app-cancha',
  imports: [
    CurrencyPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './cancha.html',
  styleUrl: './cancha.css'
})
export class CanchaComponent implements OnInit {

  private canchaService = inject(CanchaService);
  private tipoCanchaService = inject(TipoCanchaService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly canchas = signal<Cancha[]>([]);
  protected readonly tipos = signal<TipoCancha[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  /** Sin tipos de cancha cargados no se puede dar de alta una cancha. */
  protected readonly hayTipos = computed(() => this.tipos().length > 0);

  /** En mobile se muestran tarjetas apiladas; desde MD, una tabla. */
  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = ['nombre', 'tipo', 'precio', 'estado', 'acciones'];

  /**
   * Las filas de `mat-table` llegan al template sin tipar, así que la traducción
   * del estado se hace acá y no indexando el mapa desde el HTML.
   */
  protected etiquetaEstado(estado: EstadoCancha): string {
    return ETIQUETAS_ESTADO[estado];
  }

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    // Las dos listas se piden juntas: la pantalla no está lista para usarse
    // hasta que llegan ambas, así que comparten el estado de carga y de error.
    forkJoin({
      canchas: this.canchaService.listar(),
      tipos: this.tipoCanchaService.listar()
    }).subscribe({
      next: ({ canchas, tipos }) => {
        this.canchas.set(canchas);
        this.tipos.set(tipos);
        this.cargando.set(false);
      },
      // El mensaje al usuario ya lo muestra el interceptor; acá solo se refleja
      // el estado en la vista para poder ofrecer un reintento.
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  protected abrirAlta(): void {
    this.abrirFormulario(null);
  }

  protected abrirEdicion(cancha: Cancha): void {
    this.abrirFormulario(cancha);
  }

  private abrirFormulario(cancha: Cancha | null): void {
    const dialogRef = this.dialog.open<CanchaDialogComponent, DatosCanchaDialog, CanchaDto>(
      CanchaDialogComponent,
      {
        data: { cancha: cancha, tipos: this.tipos() },
        width: '32rem',
        maxWidth: '95vw'
      }
    );

    dialogRef.afterClosed().subscribe((dto) => {
      if (!dto) {
        return;
      }

      if (cancha) {
        this.actualizar(cancha.id, dto);
      } else {
        this.crear(dto);
      }
    });
  }

  private crear(dto: CanchaDto): void {
    this.canchaService.crear(dto).subscribe({
      next: (creada) => {
        this.canchas.update((canchas) => [...canchas, creada]);
        this.notificacion.exito('Cancha creada correctamente.');
      }
    });
  }

  private actualizar(id: number, dto: CanchaDto): void {
    this.canchaService.actualizar(id, dto).subscribe({
      next: (actualizada) => {
        this.canchas.update((canchas) =>
          canchas.map((cancha) => (cancha.id === id ? actualizada : cancha))
        );
        this.notificacion.exito('Cancha actualizada correctamente.');
      }
    });
  }

  protected confirmarEliminacion(cancha: Cancha): void {
    const datos: DatosConfirmacion = {
      titulo: 'Eliminar cancha',
      mensaje: `¿Seguro que querés eliminar "${cancha.nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar'
    };

    const dialogRef = this.dialog.open<ConfirmacionComponent, DatosConfirmacion, boolean>(
      ConfirmacionComponent,
      { data: datos, width: '28rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.eliminar(cancha.id);
      }
    });
  }

  private eliminar(id: number): void {
    this.canchaService.eliminar(id).subscribe({
      next: () => {
        this.canchas.update((canchas) => canchas.filter((cancha) => cancha.id !== id));
        this.notificacion.exito('Cancha eliminada correctamente.');
      }
    });
  }

}
