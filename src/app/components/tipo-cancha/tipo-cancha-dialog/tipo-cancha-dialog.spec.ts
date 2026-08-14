import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { TipoCanchaDialogComponent } from './tipo-cancha-dialog';
import { TipoCanchaFormComponent } from '../tipo-cancha-form/tipo-cancha-form';
import { TipoCancha } from '../../../models/tipo-cancha';
import { environment } from '../../../../environments/environment';

describe('TipoCanchaDialogComponent', () => {
  const url = `${environment.apiUrl}/tipos-cancha`;

  const dto = { nombre: 'Fútbol 5', descripcion: 'Césped sintético' };
  const tipoCancha = { id: 1, ...dto };

  let fixture: ComponentFixture<TipoCanchaDialogComponent>;
  let httpMock: HttpTestingController;

  /** Reemplaza al `MatDialogRef` real para poder observar si el diálogo se cerró. */
  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const montar = async (datos: TipoCancha | null) => {
    await TestBed.configureTestingModule({
      imports: [TipoCanchaDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TipoCanchaDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };

  /** Simula que el usuario completó el formulario y le dio a guardar. */
  const enviarFormulario = async () => {
    fixture.debugElement
      .query(By.directive(TipoCanchaFormComponent))
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

  it('da de alta y se cierra con el tipo que devolvió el backend', async () => {
    await montar(null);

    await enviarFormulario();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(tipoCancha);
    await fixture.whenStable();

    expect(cierres).toEqual([tipoCancha]);
  });

  it('actualiza cuando recibe un tipo para editar', async () => {
    await montar(tipoCancha);

    await enviarFormulario();

    const req = httpMock.expectOne(`${url}/${tipoCancha.id}`);
    expect(req.request.method).toBe('PUT');
    req.flush(tipoCancha);
    await fixture.whenStable();

    expect(cierres).toEqual([tipoCancha]);
  });

  it('deshabilita el guardado mientras el request está en curso', async () => {
    await montar(null);

    await enviarFormulario();

    expect(botonGuardar()?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    httpMock.expectOne(url).flush(tipoCancha);
  });

  it('se mantiene abierto si el backend rechaza el guardado', async () => {
    await montar(null);

    await enviarFormulario();

    httpMock.expectOne(url).flush(
      { mensaje: 'Ya existe un tipo de cancha con ese nombre' },
      { status: 409, statusText: 'Conflict' }
    );
    await fixture.whenStable();

    // El diálogo sigue abierto con los datos cargados y se puede reintentar.
    expect(cierres).toEqual([]);
    expect(botonGuardar()?.disabled).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
  });
});
