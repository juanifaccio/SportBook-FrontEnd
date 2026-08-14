import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { TipoEventoDialogComponent } from './tipo-evento-dialog';
import { TipoEventoFormComponent } from '../tipo-evento-form/tipo-evento-form';
import { TipoEvento } from '../../../models/tipo-evento';
import { environment } from '../../../../environments/environment';

describe('TipoEventoDialogComponent', () => {
  const url = `${environment.apiUrl}/tipos-evento`;

  const dto = { nombre: 'Cumpleaños' };
  const tipoEvento = { id: 1, ...dto };

  let fixture: ComponentFixture<TipoEventoDialogComponent>;
  let httpMock: HttpTestingController;

  /** Reemplaza al `MatDialogRef` real para poder observar si el diálogo se cerró. */
  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const montar = async (datos: TipoEvento | null) => {
    await TestBed.configureTestingModule({
      imports: [TipoEventoDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TipoEventoDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };

  /** Simula que el usuario completó el formulario y le dio a guardar. */
  const enviarFormulario = async () => {
    fixture.debugElement
      .query(By.directive(TipoEventoFormComponent))
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
    req.flush(tipoEvento);
    await fixture.whenStable();

    expect(cierres).toEqual([tipoEvento]);
  });

  it('actualiza cuando recibe un tipo para editar', async () => {
    await montar(tipoEvento);

    await enviarFormulario();

    const req = httpMock.expectOne(`${url}/${tipoEvento.id}`);
    expect(req.request.method).toBe('PUT');
    req.flush(tipoEvento);
    await fixture.whenStable();

    expect(cierres).toEqual([tipoEvento]);
  });

  it('deshabilita el guardado mientras el request está en curso', async () => {
    await montar(null);

    await enviarFormulario();

    expect(botonGuardar()?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    httpMock.expectOne(url).flush(tipoEvento);
  });

  it('se mantiene abierto si el backend rechaza el guardado', async () => {
    await montar(null);

    await enviarFormulario();

    httpMock.expectOne(url).flush(
      { mensaje: 'Ya existe un tipo de evento con ese nombre' },
      { status: 409, statusText: 'Conflict' }
    );
    await fixture.whenStable();

    // El diálogo sigue abierto con los datos cargados y se puede reintentar.
    expect(cierres).toEqual([]);
    expect(botonGuardar()?.disabled).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
  });
});
