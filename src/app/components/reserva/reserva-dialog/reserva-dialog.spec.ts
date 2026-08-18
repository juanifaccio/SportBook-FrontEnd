import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { DatosReservaDialog, ReservaDialogComponent } from './reserva-dialog';
import { environment } from '../../../../environments/environment';
import {
  USUARIO_ADMIN,
  USUARIO_CLIENTE,
  cerrarSesionDePrueba,
  iniciarSesionDePrueba
} from '../../../core/testing/sesion';

describe('ReservaDialogComponent', () => {
  const url = `${environment.apiUrl}/reservas`;
  const urlEventos = `${environment.apiUrl}/eventos`;

  const tipoCancha = { id: 17, nombre: 'Pádel', descripcion: 'Cancha de pádel' };

  const tipoEvento = { id: 3, nombre: 'Cumpleaños' };

  const cancha = {
    id: 12,
    nombre: 'Cancha 3',
    precioPorHora: 4200,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: tipoCancha.id,
    tipoCancha: tipoCancha
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
    precioTotal: 8400,
    evento: null
  };

  /** La misma reserva, pero declarando además el evento que se va a festejar. */
  const datosConEvento: DatosReservaDialog = {
    ...datos,
    evento: {
      tipoEventoId: tipoEvento.id,
      tipoEvento: tipoEvento,
      descripcion: 'Cumpleaños de 15',
      cantidadPersonas: 40
    }
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

  /**
   * Quién confirma cambia lo que se manda: el administrador reserva a nombre de
   * otro, el cliente solo para sí mismo. La sesión se arma antes del `TestBed`
   * porque `AuthService` la lee al construirse.
   */
  const preparar = async (usuario = USUARIO_ADMIN, datosDelDialogo = datos) => {
    cierres = [];
    dialogRef.disableClose = false;

    iniciarSesionDePrueba(usuario);

    await TestBed.configureTestingModule({
      imports: [ReservaDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datosDelDialogo }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservaDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await preparar();
  });

  afterEach(() => {
    cerrarSesionDePrueba();
    httpMock.verify();
  });

  it('muestra el resumen de lo que se está por reservar', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain(cancha.nombre);
    // El tipo va al lado del nombre: dos canchas pueden llamarse parecido y
    // acá ya no hay vuelta atrás.
    expect(texto).toContain('(Pádel)');
    expect(texto).toContain('20/08/2026');
    expect(texto).toContain('11:00 a 13:00');
    expect(texto).toContain(usuario.nombre);
  });

  it('reserva mandando solo el turno y el usuario, y se cierra al confirmar', async () => {
    await confirmar();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    // El administrador reserva desde el mostrador para otro, así que sí manda a
    // nombre de quién va.
    expect(req.request.body).toEqual({ horarioId: horario.id, usuarioId: usuario.id });
    req.flush(reserva);
    await fixture.whenStable();

    expect(cierres).toEqual([{ eventoPendiente: false }]);
  });

  it('cuando confirma un cliente manda solo el turno, sin el usuario', async () => {
    TestBed.resetTestingModule();
    await preparar(USUARIO_CLIENTE);

    await confirmar();

    const req = httpMock.expectOne(url);
    // El dueño lo impone el backend con el usuario de la sesión. Mandarlo desde
    // acá sugeriría que el cliente puede elegirlo, y no puede.
    expect(req.request.body).toEqual({ horarioId: horario.id });
    req.flush(reserva);
    await fixture.whenStable();

    expect(cierres).toEqual([{ eventoPendiente: false }]);
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

  describe('cuando además se declaró un evento', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();
      await preparar(USUARIO_ADMIN, datosConEvento);
    });

    it('lo muestra en el resumen antes de confirmar', () => {
      const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(texto).toContain(tipoEvento.nombre);
      expect(texto).toContain('Cumpleaños de 15');
      expect(texto).toContain('40 personas');
    });

    // Son dos requests encadenados porque el evento necesita el id de una
    // reserva que todavía no existe.
    it('lo carga con el id de la reserva recién creada', async () => {
      await confirmar();

      httpMock.expectOne(url).flush(reserva);
      await fixture.whenStable();

      const req = httpMock.expectOne(urlEventos);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        descripcion: 'Cumpleaños de 15',
        cantidadPersonas: 40,
        tipoEventoId: tipoEvento.id,
        reservaId: reserva.id
      });
      req.flush({ id: 9, ...req.request.body });
      await fixture.whenStable();

      expect(cierres).toEqual([{ eventoPendiente: false }]);
    });

    // La reserva ya quedó hecha: reintentar la duplicaría y el turno ya no está
    // libre, así que el diálogo se cierra igual avisando que faltó el evento.
    it('se cierra avisando si la reserva salió pero el evento no', async () => {
      await confirmar();

      httpMock.expectOne(url).flush(reserva);
      await fixture.whenStable();

      httpMock
        .expectOne(urlEventos)
        .flush(
          { mensaje: 'Error al crear el evento' },
          { status: 500, statusText: 'Internal Server Error' }
        );
      await fixture.whenStable();

      expect(cierres).toEqual([{ eventoPendiente: true }]);
    });

    // Si lo que falla es la reserva, el evento ni se intenta: no hay a qué
    // colgarlo.
    it('no intenta el evento si la reserva fue rechazada', async () => {
      await confirmar();

      httpMock
        .expectOne(url)
        .flush({ mensaje: 'El turno ya fue reservado' }, { status: 409, statusText: 'Conflict' });
      await fixture.whenStable();

      httpMock.expectNone(urlEventos);
      expect(cierres).toEqual([]);
    });
  });
});
