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

  protected readonly tipoFiltro = signal<number | null>(null);

  protected readonly hayTipos = computed(() => this.tipos().length > 0);

  protected readonly hayFiltro = computed(() => this.tipoFiltro() !== null);

  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = ['nombre', 'tipo', 'precio', 'estado', 'acciones'];

  protected etiquetaEstado(estado: EstadoCancha): string {
    return ETIQUETAS_ESTADO[estado];
  }

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    forkJoin({
      canchas: this.canchaService.listar(this.filtros()),
      tipos: this.tipoCanchaService.listar()
    }).subscribe({
      next: ({ canchas, tipos }) => {
        this.canchas.set(canchas);
        this.tipos.set(tipos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  private filtros(): FiltrosCancha {
    const tipo = this.tipoFiltro();

    return tipo === null ? {} : { tipoCanchaId: tipo };
  }

  protected alCambiarTipo(tipoCanchaId: number | null): void {
    this.tipoFiltro.set(tipoCanchaId);
    this.cargarCanchas();
  }

  protected limpiarFiltro(): void {
    this.alCambiarTipo(null);
  }

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

  protected nombreDelTipoFiltrado(): string {
    return this.tipos().find((tipo) => tipo.id === this.tipoFiltro())?.nombre ?? '';
  }

  protected abrirAlta(): void {
    this.abrirFormulario(null);
  }

  protected abrirEdicion(cancha: Cancha): void {
    this.abrirFormulario(cancha);
  }

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

  private cumpleElFiltro(cancha: Cancha): boolean {
    const tipo = this.tipoFiltro();

    return tipo === null || cancha.tipoCanchaId === tipo;
  }

  private agregar(cancha: Cancha): void {
    if (!this.cumpleElFiltro(cancha)) {
      return;
    }

    this.canchas.update((canchas) =>
      [...canchas, cancha].sort((una, otra) => una.nombre.localeCompare(otra.nombre))
    );
  }

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
      },
      error: () => {}
    });
  }

}
