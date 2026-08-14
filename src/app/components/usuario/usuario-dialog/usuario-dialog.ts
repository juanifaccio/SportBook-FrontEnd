import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UsuarioFormComponent } from '../usuario-form/usuario-form';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario, UsuarioDto } from '../../../models/usuario';
import { Rol } from '../../../models/rol';

/** Datos que necesita el diálogo: el usuario a editar y las opciones del selector. */
export interface DatosUsuarioDialog {
  usuario: Usuario | null;
  roles: Rol[];
}

/**
 * Envuelve al formulario en un diálogo de Material y se encarga de guardar.
 *
 * El request se hace acá y no en el listado porque si el backend rechaza los
 * datos (un email duplicado, por ejemplo) el diálogo tiene que seguir abierto
 * con lo que el usuario había cargado. Se cierra con el usuario ya guardado, o
 * con `undefined` si se cancela.
 */
@Component({
  selector: 'app-usuario-dialog',
  imports: [MatDialogModule, UsuarioFormComponent],
  templateUrl: './usuario-dialog.html'
})
export class UsuarioDialogComponent {

  protected datos = inject<DatosUsuarioDialog>(MAT_DIALOG_DATA);

  private usuarioService = inject(UsuarioService);

  private dialogRef = inject(MatDialogRef<UsuarioDialogComponent, Usuario>);

  /** Deshabilita los botones del formulario mientras el request está en curso. */
  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.datos.usuario ? 'Editar usuario' : 'Nuevo usuario';
  }

  protected alGuardar(dto: UsuarioDto): void {
    const usuario = this.datos.usuario;

    this.guardando.set(true);
    // Mientras el request viaja, el diálogo no se puede cerrar con Escape ni
    // haciendo clic afuera: si se cerrara, el listado no se enteraría del alta.
    this.dialogRef.disableClose = true;

    const peticion = usuario
      ? this.usuarioService.actualizar(usuario.id, dto)
      : this.usuarioService.crear(dto);

    peticion.subscribe({
      next: (guardado) => this.dialogRef.close(guardado),
      // El mensaje de error ya lo mostró el interceptor; acá solo se devuelve el
      // control del formulario para que se corrija y se reintente.
      error: () => {
        this.guardando.set(false);
        this.dialogRef.disableClose = false;
      }
    });
  }

  protected alCancelar(): void {
    this.dialogRef.close();
  }

}
