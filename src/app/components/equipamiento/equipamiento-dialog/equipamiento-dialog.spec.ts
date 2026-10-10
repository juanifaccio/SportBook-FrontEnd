import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { EquipamientoDialogComponent } from './equipamiento-dialog';
import { EquipamientoFormComponent } from '../equipamiento-form/equipamiento-form';
import { Equipamiento } from '../../../models/equipamiento';
import { environment } from '../../../../environments/environment';

describe('EquipamientoDialogComponent', () => {
  const url = `${environment.apiUrl}/equipamientos`;

  const dto = {
    nombre: 'Pelota de fútbol',
    descripcion: 'Número 5, de cuero sintético',
    precio: 1500,
    stock: 10
  };

  const equipamiento: Equipamiento = { id: 1, ...dto };

  let fixture: ComponentFixture<EquipamientoDialogComponent>;
  let httpMock: HttpTestingController;

  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const montar = async (datos: Equipamiento | null) => {
    await TestBed.configureTestingModule({
      imports: [EquipamientoDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EquipamientoDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };

  const enviarFormulario = async () => {
    fixture.debugElement
      .query(By.directive(EquipamientoFormComponent))
      .componentInstance.guardar.emit(dto);
    await fixture.whenStable();
  };

  const botonGuardar = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[type="submit"]'
    );

  beforeEach(() => {
    cierres = [];
    dialogRef.disableClose = false;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('da de alta y se cierra con el equipamiento que devolvió el backend', async () => {
    await montar(null);

    await enviarFormulario();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(equipamiento);
    await fixture.whenStable();

    expect(cierres).toEqual([equipamiento]);
  });

  it('actualiza cuando recibe un equipamiento para editar', async () => {
    await montar(equipamiento);

    await enviarFormulario();

    const req = httpMock.expectOne(`${url}/${equipamiento.id}`);
    expect(req.request.method).toBe('PUT');
    req.flush(equipamiento);
    await fixture.whenStable();

    expect(cierres).toEqual([equipamiento]);
  });

  it('deshabilita el guardado mientras el request está en curso', async () => {
    await montar(null);

    await enviarFormulario();

    expect(botonGuardar()?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    httpMock.expectOne(url).flush(equipamiento);
  });

  it('se mantiene abierto si el backend rechaza el guardado', async () => {
    await montar(null);

    await enviarFormulario();

    httpMock.expectOne(url).flush(
      { mensaje: 'Ya existe un equipamiento con ese nombre' },
      { status: 409, statusText: 'Conflict' }
    );
    await fixture.whenStable();

    expect(cierres).toEqual([]);
    expect(botonGuardar()?.disabled).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
  });
});
