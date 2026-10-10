import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { EquipamientoFormComponent } from '../equipamiento-form/equipamiento-form';
import { EquipamientoService } from '../../../services/equipamiento.service';
import { Equipamiento, EquipamientoDto } from '../../../models/equipamiento';

@Component({
  selector: 'app-equipamiento-dialog',
  imports: [MatDialogModule, EquipamientoFormComponent],
  templateUrl: './equipamiento-dialog.html'
})
export class EquipamientoDialogComponent {

  protected equipamiento = inject<Equipamiento | null>(MAT_DIALOG_DATA);

  private equipamientoService = inject(EquipamientoService);

  private dialogRef = inject(MatDialogRef<EquipamientoDialogComponent, Equipamiento>);

  protected readonly guardando = signal(false);

  protected get titulo(): string {
    return this.equipamiento ? 'Editar equipamiento' : 'Nuevo equipamiento';
  }

  protected alGuardar(dto: EquipamientoDto): void {
    const equipamiento = this.equipamiento;

    this.guardando.set(true);
    this.dialogRef.disableClose = true;

    const peticion = equipamiento
      ? this.equipamientoService.actualizar(equipamiento.id, dto)
      : this.equipamientoService.crear(dto);

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
