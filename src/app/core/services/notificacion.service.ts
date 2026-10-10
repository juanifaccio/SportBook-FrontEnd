import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {

  private snackBar = inject(MatSnackBar);

  exito(mensaje: string): void {
    this.mostrar(mensaje, 'notificacion-exito');
  }

  error(mensaje: string): void {
    this.mostrar(mensaje, 'notificacion-error');
  }

  private mostrar(mensaje: string, clase: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: [clase],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

}
