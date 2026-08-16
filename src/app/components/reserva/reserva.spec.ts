import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { ReservaComponent } from './reserva';
import { environment } from '../../../environments/environment';
import { PROVEEDORES_FECHA } from '../../core/fecha-adapter';

describe('ReservaComponent', () => {
  const urlCanchas = `${environment.apiUrl}/canchas`;
  const urlUsuarios = `${environment.apiUrl}/usuarios`;
  const urlHorarios = `${environment.apiUrl}/horarios`;

  const cancha = {
    id: 12,
    nombre: 'Cancha 3',
    precioPorHora: 4200,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: 17
  };

  const canchaEnMantenimiento = {
    id: 13,
    nombre: 'Cancha 2',
    precioPorHora: 4500,
    estado: 'MANTENIMIENTO' as const,
    tipoCanchaId: 17
  };

  const usuario = {
    id: 6,
    nombre: 'Lucía Gómez',
    email: 'lucia.gomez@ejemplo.com',
    telefono: '341 555-9876',
    activo: true,
    rolId: 2
  };

  const usuarioDeBaja = { ...usuario, id: 7, nombre: 'Martín Ruiz', activo: false };

  const turno = {
    id: 2,
    fecha: '2026-08-20',
    horaInicio: '11:00',
    horaFin: '13:00',
    disponible: true,
    canchaId: cancha.id
  };

  let fixture: ComponentFixture<ReservaComponent>;
  let httpMock: HttpTestingController;

  /** El pedido de turnos lleva la fecha de hoy, que cambia según el día. */
  const pedidoDeTurnos = () =>
    httpMock.expectOne((pedido) => pedido.url === urlHorarios && pedido.params.has('disponible'));

  /**
   * La pantalla pide canchas y usuarios a la vez, y recién con una cancha
   * elegida pide los turnos del día. Si ninguna cancha está disponible no queda
   * ninguna elegida, así que ese tercer pedido no llega a salir.
   */
  const responder = async (
    canchas: { estado: string }[],
    usuarios: unknown[],
    turnos: unknown[]
  ) => {
    httpMock.expectOne(urlCanchas).flush(canchas);
    httpMock.expectOne(urlUsuarios).flush(usuarios);
    await fixture.whenStable();

    if (canchas.some((cancha) => cancha.estado === 'DISPONIBLE')) {
      pedidoDeTurnos().flush(turnos);
      await fixture.whenStable();
    }

    fixture.detectChanges();
  };

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const botonReservar = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find((boton) => boton.textContent?.includes('Reservar'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservaComponent, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), PROVEEDORES_FECHA]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservaComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], [turno]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra los turnos libres de la cancha elegida', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], [turno]);

    expect(texto()).toContain('11:00 a 13:00');
  });

  it('no ofrece canchas en mantenimiento ni usuarios dados de baja', async () => {
    fixture.detectChanges();
    await responder([cancha, canchaEnMantenimiento], [usuario, usuarioDeBaja], [turno]);

    // El backend rechaza las dos cosas, así que ni siquiera aparecen como opción.
    expect(texto()).not.toContain(canchaEnMantenimiento.nombre);
    expect(texto()).not.toContain(usuarioDeBaja.nombre);
  });

  it('avisa cuando no hay ninguna cancha disponible', async () => {
    fixture.detectChanges();
    await responder([canchaEnMantenimiento], [usuario], []);

    expect(texto()).toContain('No hay canchas disponibles');
  });

  it('avisa cuando no hay usuarios activos', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuarioDeBaja], []);

    expect(texto()).toContain('No hay usuarios activos');
  });

  it('avisa cuando el día elegido no tiene turnos libres', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], []);

    expect(texto()).toContain('No quedan turnos libres');
  });

  it('vuelve a pedir los turnos al cambiar de día y olvida el que estaba elegido', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], [turno]);

    fixture.componentInstance['alElegirTurno'](turno.id);
    // El calendario entrega un `Date` local y el backend espera "AAAA-MM-DD".
    fixture.componentInstance['alCambiarFecha'](new Date(2026, 7, 21));

    const req = pedidoDeTurnos();
    expect(req.request.params.get('fecha')).toBe('2026-08-21');
    req.flush([]);
    await fixture.whenStable();

    // El turno de ayer ya no está en la lista: dejarlo elegido reservaría uno
    // que el usuario no está viendo.
    expect(fixture.componentInstance['turnoSeleccionado']()).toBeNull();
  });

  it('calcula el total con la duración del turno y habilita el botón', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], [turno]);

    expect(botonReservar()?.disabled).toBe(true);

    fixture.componentInstance['alElegirTurno'](turno.id);
    fixture.componentInstance['alElegirUsuario'](usuario.id);
    fixture.detectChanges();

    // Dos horas a 4200 por hora.
    expect(fixture.componentInstance['precioTotal']()).toBe(8400);
    expect(botonReservar()?.disabled).toBe(false);
  });

  it('muestra el error con reintento si falla la carga inicial', async () => {
    fixture.detectChanges();

    // El de usuarios se responde primero: los dos pedidos salen juntos y, en
    // cuanto uno falla, el otro queda cancelado y ya no se le puede responder.
    httpMock.expectOne(urlUsuarios).flush([usuario]);
    httpMock.expectOne(urlCanchas).flush(
      { mensaje: 'Error al listar las canchas' },
      { status: 500, statusText: 'Server Error' }
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('No se pudo cargar la pantalla');
  });
});
