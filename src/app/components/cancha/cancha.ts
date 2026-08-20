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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin, map } from 'rxjs';
import { CanchaService } from '../../services/cancha.service';
import { TipoCanchaService } from '../../services/tipo-cancha.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Cancha, EstadoCancha, ETIQUETAS_ESTADO, FiltrosCancha } from '../../models/cancha';
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
 *
 * Es también el listado de canchas filtrado por tipo que pide la propuesta. Va
 * en esta misma pantalla y no en una aparte, por lo mismo que el listado de
 * reservas vive en `/reservas`: el detalle de ese listado es justamente el ABM,
 * y separarlos sería mantener dos veces la misma tabla.
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
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule
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

  /**
   * El tipo por el que se está filtrando, o `null` para verlas todas. El filtro
   * es del servidor y no de la lista en memoria: es el backend el que lo
   * resuelve, y filtrar acá obligaría a traerse todas las canchas del complejo
   * para descartar la mayoría.
   */
  protected readonly tipoFiltro = signal<number | null>(null);

  /** Sin tipos de cancha cargados no se puede dar de alta una cancha. */
  protected readonly hayTipos = computed(() => this.tipos().length > 0);

  /** Si hay un tipo elegido, la lista vacía es del filtro y no del complejo. */
  protected readonly hayFiltro = computed(() => this.tipoFiltro() !== null);

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
      canchas: this.canchaService.listar(this.filtros()),
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

  /** Filtros activos, sin las claves que quedaron vacías. */
  private filtros(): FiltrosCancha {
    const tipo = this.tipoFiltro();

    return tipo === null ? {} : { tipoCanchaId: tipo };
  }

  /** `null` limpia el filtro: sin tipo se listan las canchas de todos. */
  protected alCambiarTipo(tipoCanchaId: number | null): void {
    this.tipoFiltro.set(tipoCanchaId);
    this.cargarCanchas();
  }

  protected limpiarFiltro(): void {
    this.alCambiarTipo(null);
  }

  /**
   * Vuelve a pedir el listado con el filtro actual. Los tipos ya están: son el
   * catálogo entero y no cambian porque se filtre.
   */
  protected cargarCanchas(): void {
    this.cargando.set(true);
    this.error.set(false);

    this.canchaService.listar(this.filtros()).subscribe({
      next: (canchas) => {
        this.canchas.set(canchas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  /** Nombre del tipo por el que se filtra, para nombrarlo en el estado vacío. */
  protected nombreDelTipoFiltrado(): string {
    return this.tipos().find((tipo) => tipo.id === this.tipoFiltro())?.nombre ?? '';
  }

  protected abrirAlta(): void {
    this.abrirFormulario(null);
  }

  protected abrirEdicion(cancha: Cancha): void {
    this.abrirFormulario(cancha);
  }

  /**
   * El alta y la edición las resuelve el diálogo, que se cierra recién cuando el
   * backend confirma. Acá solo se refleja en la lista lo que ya quedó guardado.
   */
  private abrirFormulario(cancha: Cancha | null): void {
    const dialogRef = this.dialog.open<CanchaDialogComponent, DatosCanchaDialog, Cancha>(
      CanchaDialogComponent,
      {
        data: { cancha: cancha, tipos: this.tipos() },
        width: '32rem',
        maxWidth: '95vw'
      }
    );

    dialogRef.afterClosed().subscribe((guardada) => {
      if (!guardada) {
        return;
      }

      if (cancha) {
        this.reemplazar(guardada);
        this.notificacion.exito('Cancha actualizada correctamente.');
      } else {
        this.agregar(guardada);
        this.notificacion.exito('Cancha creada correctamente.');
      }
    });
  }

  /** ¿La cancha entra en el filtro que está puesto ahora mismo? */
  private cumpleElFiltro(cancha: Cancha): boolean {
    const tipo = this.tipoFiltro();

    return tipo === null || cancha.tipoCanchaId === tipo;
  }

  /**
   * Suma a la lista la cancha recién creada, en el lugar que le toca por
   * nombre: el listado viene ordenado del backend y dejarla al final la haría
   * ver fuera de lugar hasta la próxima carga. Si se creó de un tipo que el
   * filtro no muestra no se agrega, porque el backend tampoco la habría
   * devuelto.
   */
  private agregar(cancha: Cancha): void {
    if (!this.cumpleElFiltro(cancha)) {
      return;
    }

    this.canchas.update((canchas) =>
      [...canchas, cancha].sort((una, otra) => una.nombre.localeCompare(otra.nombre))
    );
  }

  /**
   * Refleja en la lista la cancha editada. Si le cambiaron el tipo y dejó de
   * cumplir el filtro activo se la saca, en vez de mostrarla fuera de lugar.
   *
   * No se reordena la lista aunque le hayan cambiado el nombre: el usuario
   * acaba de actuar sobre esa fila y mandarla a otra posición se la haría
   * perder de vista justo cuando quiere comprobar el cambio. El orden se
   * reacomoda solo en la próxima carga.
   */
  private reemplazar(cancha: Cancha): void {
    this.canchas.update((canchas) =>
      this.cumpleElFiltro(cancha)
        ? canchas.map((actual) => (actual.id === cancha.id ? cancha : actual))
        : canchas.filter((actual) => actual.id !== cancha.id)
    );
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
