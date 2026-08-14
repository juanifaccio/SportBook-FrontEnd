import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map } from 'rxjs';
import { TipoEventoService } from '../../services/tipo-evento.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { TipoEvento } from '../../models/tipo-evento';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { TipoEventoDialogComponent } from './tipo-evento-dialog/tipo-evento-dialog';
import {
  ConfirmacionComponent,
  DatosConfirmacion
} from '../shared/confirmacion/confirmacion';

/**
 * Pantalla de ABM de tipos de evento.
 *
 * Replica la estructura de `TipoCanchaComponent`, que es la implementación de
 * referencia del proyecto: estado por signals, diálogo de formulario
 * reutilizable, listado adaptado al tamaño de pantalla y estados explícitos de
 * carga, vacío y error.
 */
@Component({
  selector: 'app-tipo-evento',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './tipo-evento.html',
  styleUrl: './tipo-evento.css'
})
export class TipoEventoComponent implements OnInit {

  private tipoEventoService = inject(TipoEventoService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly tiposEvento = signal<TipoEvento[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  /** En mobile se muestran tarjetas apiladas; desde MD, una tabla. */
  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = ['nombre', 'acciones'];

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    this.tipoEventoService.listar().subscribe({
      next: (tipos) => {
        this.tiposEvento.set(tipos);
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

  protected abrirEdicion(tipoEvento: TipoEvento): void {
    this.abrirFormulario(tipoEvento);
  }

  /**
   * El alta y la edición las resuelve el diálogo, que se cierra recién cuando el
   * backend confirma. Acá solo se refleja en la lista lo que ya quedó guardado.
   */
  private abrirFormulario(tipoEvento: TipoEvento | null): void {
    const dialogRef = this.dialog.open<
      TipoEventoDialogComponent,
      TipoEvento | null,
      TipoEvento
    >(TipoEventoDialogComponent, {
      data: tipoEvento,
      width: '32rem',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe((guardado) => {
      if (!guardado) {
        return;
      }

      if (tipoEvento) {
        this.tiposEvento.update((tipos) =>
          tipos.map((tipo) => (tipo.id === guardado.id ? guardado : tipo))
        );
        this.notificacion.exito('Tipo de evento actualizado correctamente.');
      } else {
        this.tiposEvento.update((tipos) => [...tipos, guardado]);
        this.notificacion.exito('Tipo de evento creado correctamente.');
      }
    });
  }

  protected confirmarEliminacion(tipoEvento: TipoEvento): void {
    const datos: DatosConfirmacion = {
      titulo: 'Eliminar tipo de evento',
      mensaje: `¿Seguro que querés eliminar "${tipoEvento.nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar'
    };

    const dialogRef = this.dialog.open<ConfirmacionComponent, DatosConfirmacion, boolean>(
      ConfirmacionComponent,
      { data: datos, width: '28rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.eliminar(tipoEvento.id);
      }
    });
  }

  private eliminar(id: number): void {
    this.tipoEventoService.eliminar(id).subscribe({
      next: () => {
        this.tiposEvento.update((tipos) => tipos.filter((tipo) => tipo.id !== id));
        this.notificacion.exito('Tipo de evento eliminado correctamente.');
      }
    });
  }

}
