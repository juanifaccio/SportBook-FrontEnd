import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { CanchaDialogComponent, DatosCanchaDialog } from './cancha-dialog';
import { CanchaFormComponent } from '../cancha-form/cancha-form';
import { environment } from '../../../../environments/environment';

describe('CanchaDialogComponent', () => {
  const url = `${environment.apiUrl}/canchas`;

  const tipo = { id: 2, nombre: 'Fútbol 5', descripcion: 'Césped sintético' };

  const dto = {
    nombre: 'Cancha 1',
    precioPorHora: 8500,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: tipo.id
  };

  const cancha = { id: 1, ...dto, tipoCancha: tipo };

  let fixture: ComponentFixture<CanchaDialogComponent>;
  let httpMock: HttpTestingController;

  /** Reemplaza al `MatDialogRef` real para poder observar si el diálogo se cerró. */
  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const montar = async (datos: DatosCanchaDialog) => {
    await TestBed.configureTestingModule({
      imports: [CanchaDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CanchaDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };

  /** Simula que el usuario completó el formulario y le dio a guardar. */
  const enviarFormulario = async () => {
    fixture.debugElement.query(By.directive(CanchaFormComponent)).componentInstance.guardar.emit(dto);
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

  it('da de alta y se cierra con la cancha que devolvió el backend', async () => {
    await montar({ cancha: null, tipos: [tipo] });

    await enviarFormulario();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(cancha);
    await fixture.whenStable();

    expect(cierres).toEqual([cancha]);
  });

  it('actualiza cuando recibe una cancha para editar', async () => {
    await montar({ cancha: cancha, tipos: [tipo] });

    await enviarFormulario();

    const req = httpMock.expectOne(`${url}/${cancha.id}`);
    expect(req.request.method).toBe('PUT');
    req.flush(cancha);
    await fixture.whenStable();

    expect(cierres).toEqual([cancha]);
  });

  it('deshabilita el guardado mientras el request está en curso', async () => {
    await montar({ cancha: null, tipos: [tipo] });

    await enviarFormulario();

    expect(botonGuardar()?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    httpMock.expectOne(url).flush(cancha);
  });

  it('se mantiene abierto si el backend rechaza el guardado', async () => {
    await montar({ cancha: null, tipos: [tipo] });

    await enviarFormulario();

    httpMock.expectOne(url).flush(
      { mensaje: 'Ya existe una cancha con ese nombre' },
      { status: 409, statusText: 'Conflict' }
    );
    await fixture.whenStable();

    // El diálogo sigue abierto con los datos cargados y se puede reintentar.
    expect(cierres).toEqual([]);
    expect(botonGuardar()?.disabled).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
  });
});
