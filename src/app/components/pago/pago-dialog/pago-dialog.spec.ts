import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { DatosPagoDialog, PagoDialogComponent } from './pago-dialog';
import { PagoFormComponent } from '../pago-form/pago-form';
import { environment } from '../../../../environments/environment';

describe('PagoDialogComponent', () => {
  const url = `${environment.apiUrl}/pagos`;

  const reserva = {
    id: 8,
    fecha: '2026-08-20',
    horaInicio: '11:00',
    horaFin: '13:00',
    estado: 'PENDIENTE' as const,
    precioTotal: 8400,
    usuarioId: 6,
    canchaId: 12,
    horarioId: 2,
    pagos: []
  };

  const dto = { reservaId: reserva.id, monto: 8400, metodo: 'EFECTIVO' as const };

  const pago = {
    id: 1,
    monto: 8400,
    fecha: '2026-08-18',
    metodo: 'EFECTIVO' as const,
    estado: 'REGISTRADO' as const,
    reservaId: reserva.id,
    reserva: reserva
  };

  let fixture: ComponentFixture<PagoDialogComponent>;
  let httpMock: HttpTestingController;

  /** Reemplaza al `MatDialogRef` real para poder observar si el diálogo se cerró. */
  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const montar = async (aCorregir: DatosPagoDialog['pago']) => {
    const datos: DatosPagoDialog = { pago: aCorregir, reservas: [reserva] };

    await TestBed.configureTestingModule({
      imports: [PagoDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PagoDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };

  /** Simula que el usuario completó el formulario y le dio a guardar. */
  const enviarFormulario = async () => {
    fixture.debugElement
      .query(By.directive(PagoFormComponent))
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

  it('registra el pago y se cierra con lo que devolvió el backend', async () => {
    await montar(null);

    await enviarFormulario();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(pago);
    await fixture.whenStable();

    expect(cierres).toEqual([pago]);
  });

  // El monto de un pago no se edita: para eso se anula y se registra el correcto.
  it('al corregir manda solamente el método', async () => {
    await montar(pago);

    await enviarFormulario();

    const req = httpMock.expectOne(`${url}/${pago.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ metodo: dto.metodo });
    req.flush(pago);
    await fixture.whenStable();

    expect(cierres).toEqual([pago]);
  });

  it('deshabilita el guardado mientras el request está en curso', async () => {
    await montar(null);

    await enviarFormulario();

    expect(botonGuardar()?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    httpMock.expectOne(url).flush(pago);
  });

  it('se mantiene abierto si el backend rechaza el monto', async () => {
    await montar(null);

    await enviarFormulario();

    httpMock
      .expectOne(url)
      .flush(
        { mensaje: 'El monto supera el saldo de la reserva, que es 5400' },
        { status: 409, statusText: 'Conflict' }
      );
    await fixture.whenStable();

    // El diálogo sigue abierto con los datos cargados y se puede reintentar.
    expect(cierres).toEqual([]);
    expect(botonGuardar()?.disabled).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
  });
});
