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
import { TipoCanchaService } from '../../services/tipo-cancha.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { TipoCancha, TipoCanchaDto } from '../../models/tipo-cancha';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { TipoCanchaDialogComponent } from './tipo-cancha-dialog/tipo-cancha-dialog';
import {
  ConfirmacionComponent,
  DatosConfirmacion
} from '../shared/confirmacion/confirmacion';

/**
 * Pantalla de ABM de tipos de cancha.
 *
 * Es la implementación de referencia del proyecto: el resto de las entidades del
 * dominio (TipoEvento, Equipamiento, Cancha...) se construyen replicando esta
 * estructura — estado por signals, diálogo de formulario reutilizable, listado
 * adaptado al tamaño de pantalla y estados explícitos de carga, vacío y error.
 */
@Component({
  selector: 'app-tipo-cancha',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './tipo-cancha.html',
  styleUrl: './tipo-cancha.css'
})
export class TipoCanchaComponent implements OnInit {

  private tipoCanchaService = inject(TipoCanchaService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly tiposCancha = signal<TipoCancha[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  /** En mobile se muestran tarjetas apiladas; desde MD, una tabla. */
  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = ['nombre', 'descripcion', 'acciones'];

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    this.tipoCanchaService.listar().subscribe({
      next: (tipos) => {
        this.tiposCancha.set(tipos);
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

  protected abrirEdicion(tipoCancha: TipoCancha): void {
    this.abrirFormulario(tipoCancha);
  }

  private abrirFormulario(tipoCancha: TipoCancha | null): void {
    const dialogRef = this.dialog.open<
      TipoCanchaDialogComponent,
      TipoCancha | null,
      TipoCanchaDto
    >(TipoCanchaDialogComponent, {
      data: tipoCancha,
      width: '32rem',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe((dto) => {
      if (!dto) {
        return;
      }

      if (tipoCancha) {
        this.actualizar(tipoCancha.id, dto);
      } else {
        this.crear(dto);
      }
    });
  }

  private crear(dto: TipoCanchaDto): void {
    this.tipoCanchaService.crear(dto).subscribe({
      next: (creado) => {
        this.tiposCancha.update((tipos) => [...tipos, creado]);
        this.notificacion.exito('Tipo de cancha creado correctamente.');
      }
    });
  }

  private actualizar(id: number, dto: TipoCanchaDto): void {
    this.tipoCanchaService.actualizar(id, dto).subscribe({
      next: (actualizado) => {
        this.tiposCancha.update((tipos) =>
          tipos.map((tipo) => (tipo.id === id ? actualizado : tipo))
        );
        this.notificacion.exito('Tipo de cancha actualizado correctamente.');
      }
    });
  }

  protected confirmarEliminacion(tipoCancha: TipoCancha): void {
    const datos: DatosConfirmacion = {
      titulo: 'Eliminar tipo de cancha',
      mensaje: `¿Seguro que querés eliminar "${tipoCancha.nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar'
    };

    const dialogRef = this.dialog.open<ConfirmacionComponent, DatosConfirmacion, boolean>(
      ConfirmacionComponent,
      { data: datos, width: '28rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.eliminar(tipoCancha.id);
      }
    });
  }

  private eliminar(id: number): void {
    this.tipoCanchaService.eliminar(id).subscribe({
      next: () => {
        this.tiposCancha.update((tipos) => tipos.filter((tipo) => tipo.id !== id));
        this.notificacion.exito('Tipo de cancha eliminado correctamente.');
      }
    });
  }

}
