import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map } from 'rxjs';
import { EquipamientoService } from '../../services/equipamiento.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Equipamiento } from '../../models/equipamiento';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { EquipamientoDialogComponent } from './equipamiento-dialog/equipamiento-dialog';
import {
  ConfirmacionComponent,
  DatosConfirmacion
} from '../shared/confirmacion/confirmacion';

@Component({
  selector: 'app-equipamiento',
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './equipamiento.html',
  styleUrl: './equipamiento.css'
})
export class EquipamientoComponent implements OnInit {

  private equipamientoService = inject(EquipamientoService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly equipamientos = signal<Equipamiento[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = ['nombre', 'descripcion', 'precio', 'stock', 'acciones'];

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    this.equipamientoService.listar().subscribe({
      next: (equipamientos) => {
        this.equipamientos.set(equipamientos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  protected abrirAlta(): void {
    this.abrirFormulario(null);
  }

  protected abrirEdicion(equipamiento: Equipamiento): void {
    this.abrirFormulario(equipamiento);
  }

  private abrirFormulario(equipamiento: Equipamiento | null): void {
    const dialogRef = this.dialog.open<
      EquipamientoDialogComponent,
      Equipamiento | null,
      Equipamiento
    >(EquipamientoDialogComponent, {
      data: equipamiento,
      width: '32rem',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe((guardado) => {
      if (!guardado) {
        return;
      }

      if (equipamiento) {
        this.equipamientos.update((lista) =>
          lista.map((item) => (item.id === guardado.id ? guardado : item))
        );
        this.notificacion.exito('Equipamiento actualizado correctamente.');
      } else {
        this.equipamientos.update((lista) =>
          [...lista, guardado].sort((uno, otro) => uno.nombre.localeCompare(otro.nombre))
        );
        this.notificacion.exito('Equipamiento creado correctamente.');
      }
    });
  }

  protected confirmarEliminacion(equipamiento: Equipamiento): void {
    const datos: DatosConfirmacion = {
      titulo: 'Eliminar equipamiento',
      mensaje: `¿Seguro que querés eliminar "${equipamiento.nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar'
    };

    const dialogRef = this.dialog.open<ConfirmacionComponent, DatosConfirmacion, boolean>(
      ConfirmacionComponent,
      { data: datos, width: '28rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.eliminar(equipamiento.id);
      }
    });
  }

  private eliminar(id: number): void {
    this.equipamientoService.eliminar(id).subscribe({
      next: () => {
        this.equipamientos.update((lista) => lista.filter((item) => item.id !== id));
        this.notificacion.exito('Equipamiento eliminado correctamente.');
      },
      error: () => {}
    });
  }

}
