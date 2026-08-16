import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { DatosHorarioDialog, HorarioDialogComponent } from './horario-dialog';
import { HorarioFormComponent } from '../horario-form/horario-form';
import { environment } from '../../../../environments/environment';
import { PROVEEDORES_FECHA } from '../../../core/fecha-adapter';

describe('HorarioDialogComponent', () => {
  const url = `${environment.apiUrl}/horarios`;

  const cancha = {
    id: 3,
    nombre: 'Cancha 1',
    precioPorHora: 8500,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: 2
  };

  const dto = {
    fecha: '2026-08-20',
    horaInicio: '10:00',
    horaFin: '11:00',
    disponible: true,
    canchaId: cancha.id
  };

  const horario = { id: 1, ...dto, cancha: cancha };

  let fixture: ComponentFixture<HorarioDialogComponent>;
  let httpMock: HttpTestingController;

  /** Reemplaza al `MatDialogRef` real para poder observar si el diálogo se cerró. */
  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const montar = async (datos: DatosHorarioDialog) => {
    await TestBed.configureTestingModule({
      imports: [HorarioDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos },
        PROVEEDORES_FECHA
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HorarioDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };

  /** Simula que el usuario completó el formulario y le dio a guardar. */
  const enviarFormulario = async () => {
    fixture.debugElement
      .query(By.directive(HorarioFormComponent))
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

  it('da de alta y se cierra con el turno que devolvió el backend', async () => {
    await montar({ horario: null, canchas: [cancha], canchaSeleccionada: cancha.id });

    await enviarFormulario();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(horario);
    await fixture.whenStable();

    expect(cierres).toEqual([horario]);
  });

  it('actualiza cuando recibe un turno para editar', async () => {
    await montar({ horario: horario, canchas: [cancha], canchaSeleccionada: cancha.id });

    await enviarFormulario();

    const req = httpMock.expectOne(`${url}/${horario.id}`);
    expect(req.request.method).toBe('PUT');
    req.flush(horario);
    await fixture.whenStable();

    expect(cierres).toEqual([horario]);
  });

  it('deshabilita el guardado mientras el request está en curso', async () => {
    await montar({ horario: null, canchas: [cancha], canchaSeleccionada: cancha.id });

    await enviarFormulario();

    expect(botonGuardar()?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    httpMock.expectOne(url).flush(horario);
  });

  it('se mantiene abierto si el turno se superpone con otro', async () => {
    await montar({ horario: null, canchas: [cancha], canchaSeleccionada: cancha.id });

    await enviarFormulario();

    httpMock.expectOne(url).flush(
      { mensaje: 'La cancha ya tiene un horario que se superpone con ese' },
      { status: 409, statusText: 'Conflict' }
    );
    await fixture.whenStable();

    // El diálogo sigue abierto con los datos cargados y se puede reintentar.
    expect(cierres).toEqual([]);
    expect(botonGuardar()?.disabled).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
  });
});
