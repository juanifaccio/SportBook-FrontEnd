import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { EventoComponent } from './evento';
import { environment } from '../../../environments/environment';
import {
  USUARIO_ADMIN,
  cerrarSesionDePrueba,
  iniciarSesionDePrueba
} from '../../core/testing/sesion';

describe('EventoComponent', () => {
  const urlEventos = `${environment.apiUrl}/eventos`;
  const urlReservas = `${environment.apiUrl}/reservas`;
  const urlTipos = `${environment.apiUrl}/tipos-evento`;

  const tipoEvento = { id: 3, nombre: 'Cumpleaños' };

  const cancha = {
    id: 12,
    nombre: 'Cancha 3',
    precioPorHora: 4200,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: 17,
    tipoCancha: { id: 17, nombre: 'Pádel', descripcion: 'Cancha de pádel' }
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

  const reservaCancelada = { ...reserva, id: 9, estado: 'CANCELADA' as const };

  const evento = {
    id: 1,
    descripcion: 'Cumpleaños de 15',
    cantidadPersonas: 40,
    tipoEventoId: tipoEvento.id,
    reservaId: reserva.id,
    tipoEvento: tipoEvento,
    reserva: reserva
  };

  let fixture: ComponentFixture<EventoComponent>;
  let httpMock: HttpTestingController;

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  /** Las tres listas salen juntas en un `forkJoin`. */
  const responder = async (eventos: unknown[], reservas: unknown[] = [], tipos: unknown[] = []) => {
    httpMock.expectOne(urlEventos).flush(eventos);
    httpMock.expectOne((pedido) => pedido.url === urlReservas).flush(reservas);
    httpMock.expectOne(urlTipos).flush(tipos);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const botonNuevo = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find((boton) => boton.textContent?.includes('Nuevo evento'));

  beforeEach(async () => {
    // La pantalla muestra el dueño solo para el administrador, así que la sesión
    // se arma antes del `TestBed`: `AuthService` la lee al construirse.
    iniciarSesionDePrueba(USUARIO_ADMIN);

    await TestBed.configureTestingModule({
      imports: [EventoComponent, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(EventoComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    cerrarSesionDePrueba();
  });

  it('se crea correctamente', async () => {
    fixture.detectChanges();
    await responder([]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra los eventos que devuelve el backend con su reserva', async () => {
    fixture.detectChanges();
    await responder([evento], [reserva], [tipoEvento]);

    expect(texto()).toContain('Cumpleaños de 15');
    expect(texto()).toContain(tipoEvento.nombre);
    // La reserva se identifica por día, horario y cancha.
    expect(texto()).toContain('20/08/2026');
    expect(texto()).toContain(cancha.nombre);
  });

  it('muestra el estado vacío cuando no hay eventos cargados', async () => {
    fixture.detectChanges();
    await responder([], [reserva], [tipoEvento]);

    expect(texto()).toContain('Todavía no hay eventos');
  });

  it('ofrece reintentar cuando la carga falla', async () => {
    fixture.detectChanges();

    // El de eventos se responde último: los tres pedidos salen juntos y, en
    // cuanto uno falla, los otros quedan cancelados y ya no se les puede
    // responder.
    httpMock.expectOne((pedido) => pedido.url === urlReservas).flush([]);
    httpMock.expectOne(urlTipos).flush([]);
    httpMock
      .expectOne(urlEventos)
      .flush({ mensaje: 'Error interno' }, { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('Reintentar');
  });

  // Sin tipos no hay nada que elegir en el formulario, así que abrirlo sería
  // ofrecer un selector vacío.
  it('no deja crear si no hay tipos de evento', async () => {
    fixture.detectChanges();
    await responder([], [reserva], []);

    expect(botonNuevo()?.disabled).toBe(true);
  });

  // Una reserva con evento y una cancelada no admiten uno nuevo: si no queda
  // ninguna libre, el alta no tiene sobre qué trabajar.
  it('no deja crear si todas las reservas vigentes ya tienen evento', async () => {
    fixture.detectChanges();
    await responder([evento], [reserva, reservaCancelada], [tipoEvento]);

    expect(botonNuevo()?.disabled).toBe(true);
  });

  it('solo ofrece las reservas vigentes que todavía no tienen evento', async () => {
    const libre = { ...reserva, id: 10 };

    fixture.detectChanges();
    await responder([evento], [reserva, reservaCancelada, libre], [tipoEvento]);

    expect(fixture.componentInstance['reservasDisponibles']()).toEqual([libre]);
    expect(botonNuevo()?.disabled).toBe(false);
  });
});
