import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { DatosEventoDialog, EventoDialogComponent } from './evento-dialog';
import { EventoFormComponent } from '../evento-form/evento-form';
import { environment } from '../../../../environments/environment';

describe('EventoDialogComponent', () => {
  const url = `${environment.apiUrl}/eventos`;

  const tipoEvento = { id: 3, nombre: 'Cumpleaños' };

  const cancha = {
    id: 12,
    nombre: 'Cancha 3',
    precioPorHora: 4200,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: 17
  };

  const reserva = {
    id: 8,
    fecha: '2026-08-20',
    horaInicio: '11:00',
    horaFin: '13:00',
    estado: 'CONFIRMADA' as const,
    precioTotal: 8400,
    usuarioId: 6,
    canchaId: cancha.id,
    horarioId: 2,
    cancha: cancha
  };

  const dto = {
    descripcion: 'Cumpleaños de 15',
    cantidadPersonas: 40,
    tipoEventoId: tipoEvento.id,
    reservaId: reserva.id
  };

  const evento = { id: 1, ...dto, tipoEvento: tipoEvento, reserva: reserva };

  let fixture: ComponentFixture<EventoDialogComponent>;
  let httpMock: HttpTestingController;

  /** Reemplaza al `MatDialogRef` real para poder observar si el diálogo se cerró. */
  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const montar = async (aEditar: DatosEventoDialog['evento']) => {
    const datos: DatosEventoDialog = {
      evento: aEditar,
      reservas: [reserva],
      tipos: [tipoEvento]
    };

    await TestBed.configureTestingModule({
      imports: [EventoDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventoDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };

  /** Simula que el usuario completó el formulario y le dio a guardar. */
  const enviarFormulario = async () => {
    fixture.debugElement
      .query(By.directive(EventoFormComponent))
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

  it('da de alta y se cierra con el evento que devolvió el backend', async () => {
    await montar(null);

    await enviarFormulario();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(evento);
    await fixture.whenStable();

    expect(cierres).toEqual([evento]);
  });

  // Un evento no se muda de reserva: el PUT va sin `reservaId` aunque el
  // formulario lo tenga cargado.
  it('actualiza sin mandar la reserva cuando recibe un evento para editar', async () => {
    await montar(evento);

    await enviarFormulario();

    const req = httpMock.expectOne(`${url}/${evento.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      descripcion: dto.descripcion,
      cantidadPersonas: dto.cantidadPersonas,
      tipoEventoId: dto.tipoEventoId
    });
    req.flush(evento);
    await fixture.whenStable();

    expect(cierres).toEqual([evento]);
  });

  it('deshabilita el guardado mientras el request está en curso', async () => {
    await montar(null);

    await enviarFormulario();

    expect(botonGuardar()?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    httpMock.expectOne(url).flush(evento);
  });

  it('se mantiene abierto si el backend rechaza el guardado', async () => {
    await montar(null);

    await enviarFormulario();

    httpMock
      .expectOne(url)
      .flush({ mensaje: 'La reserva ya tiene un evento' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    // El diálogo sigue abierto con los datos cargados y se puede reintentar.
    expect(cierres).toEqual([]);
    expect(botonGuardar()?.disabled).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
  });
});
