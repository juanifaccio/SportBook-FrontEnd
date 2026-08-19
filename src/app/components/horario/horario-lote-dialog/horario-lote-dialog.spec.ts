import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { DatosLoteDialog, HorarioLoteDialogComponent } from './horario-lote-dialog';
import { HorarioLoteFormComponent } from '../horario-lote-form/horario-lote-form';
import { environment } from '../../../../environments/environment';
import { PROVEEDORES_FECHA } from '../../../core/fecha-adapter';

describe('HorarioLoteDialogComponent', () => {
  const url = `${environment.apiUrl}/horarios/lote`;

  const cancha = {
    id: 3,
    nombre: 'Cancha 1',
    precioPorHora: 8500,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: 2
  };

  const dto = {
    fecha: '2026-08-20',
    horaInicio: '08:00',
    horaFin: '10:00',
    canchaId: cancha.id,
    duracion: 60
  };

  const resultado = {
    creados: [
      {
        id: 1,
        fecha: '2026-08-20',
        horaInicio: '08:00',
        horaFin: '09:00',
        disponible: true,
        canchaId: cancha.id,
        cancha: cancha
      }
    ],
    omitidos: 1
  };

  let fixture: ComponentFixture<HorarioLoteDialogComponent>;
  let httpMock: HttpTestingController;

  /** Reemplaza al `MatDialogRef` real para poder observar si el diálogo se cerró. */
  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const montar = async (datos: DatosLoteDialog) => {
    await TestBed.configureTestingModule({
      imports: [HorarioLoteDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos },
        PROVEEDORES_FECHA
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HorarioLoteDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };

  /** Simula que el usuario completó el formulario y le dio a generar. */
  const enviarFormulario = async () => {
    fixture.debugElement
      .query(By.directive(HorarioLoteFormComponent))
      .componentInstance.generar.emit(dto);
    await fixture.whenStable();
  };

  const botonGenerar = () =>
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

  it('genera y se cierra con lo que devolvió el backend', async () => {
    await montar({ canchas: [cancha], canchaSeleccionada: cancha.id });

    await enviarFormulario();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(resultado);
    await fixture.whenStable();

    // El resultado entero, no un booleano: la pantalla necesita cuántos se
    // crearon y cuántos ya estaban para poder contarlo.
    expect(cierres).toEqual([resultado]);
  });

  it('deshabilita el formulario mientras el request está en curso', async () => {
    await montar({ canchas: [cancha], canchaSeleccionada: cancha.id });

    await enviarFormulario();

    expect(botonGenerar()?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    httpMock.expectOne(url).flush(resultado);
  });

  it('se mantiene abierto si el día ya estaba completo', async () => {
    await montar({ canchas: [cancha], canchaSeleccionada: cancha.id });

    await enviarFormulario();

    httpMock
      .expectOne(url)
      .flush(
        { mensaje: 'Todos los turnos de ese rango ya estaban cargados' },
        { status: 409, statusText: 'Conflict' }
      );
    await fixture.whenStable();

    // Sigue abierto con los datos cargados: cambiar el rango o la duración es
    // justo lo que hay que hacer para que el lote sirva de algo.
    expect(cierres).toEqual([]);
    expect(botonGenerar()?.disabled).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
  });

  it('se cierra sin resultado cuando el usuario cancela', async () => {
    await montar({ canchas: [cancha], canchaSeleccionada: cancha.id });

    fixture.debugElement
      .query(By.directive(HorarioLoteFormComponent))
      .componentInstance.cancelar.emit();
    await fixture.whenStable();

    expect(cierres).toEqual([undefined]);
  });
});
