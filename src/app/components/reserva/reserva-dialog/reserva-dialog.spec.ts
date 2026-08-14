import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DatosReservaDialog, ReservaDialogComponent } from './reserva-dialog';
import { environment } from '../../../../environments/environment';

describe('ReservaDialogComponent', () => {
  const url = `${environment.apiUrl}/reservas`;

  const cancha = {
    id: 12,
    nombre: 'Cancha 3',
    precioPorHora: 4200,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: 17
  };

  const horario = {
    id: 2,
    fecha: '2026-08-20',
    horaInicio: '11:00',
    horaFin: '13:00',
    disponible: true,
    canchaId: cancha.id
  };

  const usuario = {
    id: 6,
    nombre: 'Lucía Gómez',
    email: 'lucia.gomez@ejemplo.com',
    telefono: '341 555-9876',
    activo: true,
    rolId: 2
  };

  const datos: DatosReservaDialog = {
    cancha: cancha,
    horario: horario,
    usuario: usuario,
    precioTotal: 8400
  };

  const reserva = {
    id: 1,
    fecha: horario.fecha,
    horaInicio: horario.horaInicio,
    horaFin: horario.horaFin,
    estado: 'CONFIRMADA' as const,
    precioTotal: 8400,
    usuarioId: usuario.id,
    canchaId: cancha.id,
    horarioId: horario.id
  };

  let fixture: ComponentFixture<ReservaDialogComponent>;
  let httpMock: HttpTestingController;

  /** Reemplaza al `MatDialogRef` real para poder observar si el diálogo se cerró. */
  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const boton = (etiqueta: string) =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find((candidato) => candidato.textContent?.includes(etiqueta));

  const confirmar = async () => {
    boton('Confirmar reserva')?.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    cierres = [];
    dialogRef.disableClose = false;

    await TestBed.configureTestingModule({
      imports: [ReservaDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservaDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('muestra el resumen de lo que se está por reservar', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain(cancha.nombre);
    expect(texto).toContain('20/08/2026');
    expect(texto).toContain('11:00 a 13:00');
    expect(texto).toContain(usuario.nombre);
  });

  it('reserva mandando solo el turno y el usuario, y se cierra al confirmar', async () => {
    await confirmar();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ horarioId: horario.id, usuarioId: usuario.id });
    req.flush(reserva);
    await fixture.whenStable();

    expect(cierres).toEqual([true]);
  });

  it('bloquea los botones mientras el request está en curso', async () => {
    await confirmar();
    fixture.detectChanges();

    expect(boton('Confirmar reserva')?.disabled).toBe(true);
    expect(boton('Cancelar')?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    httpMock.expectOne(url).flush(reserva);
  });

  it('se mantiene abierto si alguien se adelantó y tomó el turno', async () => {
    await confirmar();

    httpMock
      .expectOne(url)
      .flush({ mensaje: 'El turno ya fue reservado' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    fixture.detectChanges();

    // Sigue abierto para que el usuario elija otro turno o reintente.
    expect(cierres).toEqual([]);
    expect(boton('Confirmar reserva')?.disabled).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
  });

  it('se cierra sin reservar al cancelar', async () => {
    boton('Cancelar')?.click();
    await fixture.whenStable();

    expect(cierres).toEqual([undefined]);
  });
});
