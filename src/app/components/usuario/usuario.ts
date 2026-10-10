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
import { forkJoin, map } from 'rxjs';
import { UsuarioService } from '../../services/usuario.service';
import { RolService } from '../../services/rol.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Usuario } from '../../models/usuario';
import { Rol, etiquetaRol } from '../../models/rol';
import { BREAKPOINT_MD } from '../../core/breakpoints';
import { UsuarioDialogComponent, DatosUsuarioDialog } from './usuario-dialog/usuario-dialog';
import {
  ConfirmacionComponent,
  DatosConfirmacion
} from '../shared/confirmacion/confirmacion';

@Component({
  selector: 'app-usuario',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './usuario.html',
  styleUrl: './usuario.css'
})
export class UsuarioComponent implements OnInit {

  private usuarioService = inject(UsuarioService);
  private rolService = inject(RolService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly esPantallaAncha = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MD).pipe(map((estado) => estado.matches)),
    { initialValue: false }
  );

  protected readonly columnas = ['nombre', 'email', 'telefono', 'rol', 'estado', 'acciones'];

  protected etiquetaRol(usuario: Usuario): string {
    return usuario.rol ? etiquetaRol(usuario.rol.nombre) : '';
  }

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    forkJoin({
      usuarios: this.usuarioService.listar(),
      roles: this.rolService.listar()
    }).subscribe({
      next: ({ usuarios, roles }) => {
        this.usuarios.set(usuarios);
        this.roles.set(roles);
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

  protected abrirEdicion(usuario: Usuario): void {
    this.abrirFormulario(usuario);
  }

  private abrirFormulario(usuario: Usuario | null): void {
    const dialogRef = this.dialog.open<UsuarioDialogComponent, DatosUsuarioDialog, Usuario>(
      UsuarioDialogComponent,
      {
        data: { usuario: usuario, roles: this.roles() },
        width: '32rem',
        maxWidth: '95vw'
      }
    );

    dialogRef.afterClosed().subscribe((guardado) => {
      if (!guardado) {
        return;
      }

      if (usuario) {
        this.usuarios.update((usuarios) =>
          usuarios.map((actual) => (actual.id === guardado.id ? guardado : actual))
        );
        this.notificacion.exito('Usuario actualizado correctamente.');
      } else {
        this.usuarios.update((usuarios) => [...usuarios, guardado]);
        this.notificacion.exito('Usuario creado correctamente.');
      }
    });
  }

  protected confirmarEliminacion(usuario: Usuario): void {
    const datos: DatosConfirmacion = {
      titulo: 'Eliminar usuario',
      mensaje: `¿Seguro que querés eliminar a "${usuario.nombre}"? Esta acción no se puede deshacer. Si solo querés que no pueda usar la aplicación, editalo y desmarcá "Usuario activo".`,
      textoConfirmar: 'Eliminar'
    };

    const dialogRef = this.dialog.open<ConfirmacionComponent, DatosConfirmacion, boolean>(
      ConfirmacionComponent,
      { data: datos, width: '28rem', maxWidth: '95vw' }
    );

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.eliminar(usuario.id);
      }
    });
  }

  private eliminar(id: number): void {
    this.usuarioService.eliminar(id).subscribe({
      next: () => {
        this.usuarios.update((usuarios) => usuarios.filter((usuario) => usuario.id !== id));
        this.notificacion.exito('Usuario eliminado correctamente.');
      },
      error: () => {}
    });
  }

}
