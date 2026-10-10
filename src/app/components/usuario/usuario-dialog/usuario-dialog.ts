import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UsuarioFormComponent } from '../usuario-form/usuario-form';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario, UsuarioDto } from '../../../models/usuario';
import { Rol } from '../../../models/rol';

export interface DatosUsuarioDialog {
  usuario: Usuario | null;
  roles: Rol[];
}

@Component({
  selector: 'app-usuario-dialog',
  imports: [MatDialogModule, UsuarioFormComponent],
  templateUrl: './usuario-dialog.html'
})
export class UsuarioDialogComponent {

  protected datos = inject<DatosUsuarioDialog>(MAT_DIALOG_DATA);

  private usuarioService = inject(UsuarioService);

  private dialogRef = inject(MatDialogRef<UsuarioDialogComponent, Usuario>);

  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.datos.usuario ? 'Editar usuario' : 'Nuevo usuario';
  }

  protected alGuardar(dto: UsuarioDto): void {
    const usuario = this.datos.usuario;

    this.guardando.set(true);
    this.dialogRef.disableClose = true;

    const peticion = usuario
      ? this.usuarioService.actualizar(usuario.id, dto)
      : this.usuarioService.crear(dto);

    peticion.subscribe({
      next: (guardado) => this.dialogRef.close(guardado),
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
