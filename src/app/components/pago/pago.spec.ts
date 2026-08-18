import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { PagoComponent } from './pago';
import { environment } from '../../../environments/environment';
import {
  USUARIO_ADMIN,
  USUARIO_CLIENTE,
  cerrarSesionDePrueba,
  iniciarSesionDePrueba
} from '../../core/testing/sesion';

describe('PagoComponent', () => {
  const urlPagos = `${environment.apiUrl}/pagos`;
  const urlReservas = `${environment.apiUrl}/reservas`;

  const cancha = {
    id: 12,
    nombre: 'Cancha 3',
    precioPorHora: 4200,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: 17
  };

  /** Reserva de 8400 con una seña de 3000: le faltan 5400. */
  const reserva = {
    id: 8,
    fecha: '2026-08-20',
    horaInicio: '11:00',
    horaFin: '13:00',
    estado: 'PENDIENTE' as const,
    precioTotal: 8400,
    usuarioId: 6,
    canchaId: cancha.id,
    horarioId: 2,
    cancha: cancha,
    pagos: [
      {
        id: 1,
        monto: 3000,
        fecha: '2026-08-18',
        metodo: 'EFECTIVO' as const,
        estado: 'REGISTRADO' as const,
        reservaId: 8
      }
    ]
  };

  const pago = { ...reserva.pagos[0], reserva: reserva };

  let fixture: ComponentFixture<PagoComponent>;
  let httpMock: HttpTestingController;

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const responder = async (pagos: unknown[], reservas: unknown[] = []) => {
    httpMock.expectOne((pedido) => pedido.url === urlPagos).flush(pagos);
    httpMock.expectOne((pedido) => pedido.url === urlReservas).flush(reservas);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const botonRegistrar = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find((boton) => boton.textContent?.includes('Registrar un pago'));

  const preparar = async (usuario = USUARIO_ADMIN) => {
    iniciarSesionDePrueba(usuario);

    await TestBed.configureTestingModule({
      imports: [PagoComponent, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PagoComponent);
    httpMock = TestBed.inject(HttpTestingController);
  };

  beforeEach(async () => {
    await preparar();
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

  it('muestra los pagos que devuelve el backend con su reserva', async () => {
    fixture.detectChanges();
    await responder([pago], [reserva]);

    expect(texto()).toContain('Efectivo');
    expect(texto()).toContain('Registrado');
    expect(texto()).toContain('20/08/2026');
  });

  it('muestra el estado vacío cuando no hay pagos', async () => {
    fixture.detectChanges();
    await responder([], [reserva]);

    expect(texto()).toContain('Todavía no hay pagos');
  });

  it('ofrece reintentar cuando la carga falla', async () => {
    fixture.detectChanges();

    // El de pagos se responde último: los dos salen juntos y, en cuanto uno
    // falla, el otro queda cancelado y ya no se le puede responder.
    httpMock.expectOne((pedido) => pedido.url === urlReservas).flush([]);
    httpMock
      .expectOne((pedido) => pedido.url === urlPagos)
      .flush({ mensaje: 'Error interno' }, { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('Reintentar');
  });

  // Solo se puede cobrar lo que falta: una reserva paga o cancelada no entra.
  it('solo ofrece las reservas vigentes con saldo', async () => {
    const paga = { ...reserva, id: 9, estado: 'CONFIRMADA' as const, pagos: [{ ...pago, id: 2, monto: 8400 }] };
    const cancelada = { ...reserva, id: 10, estado: 'CANCELADA' as const, pagos: [] };

    fixture.detectChanges();
    await responder([pago], [reserva, paga, cancelada]);

    expect(fixture.componentInstance['reservasConSaldo']().map((una) => una.id)).toEqual([
      reserva.id
    ]);
    expect(botonRegistrar()?.disabled).toBe(false);
  });

  it('no deja registrar si no queda ninguna reserva con saldo', async () => {
    const paga = { ...reserva, estado: 'CONFIRMADA' as const, pagos: [{ ...pago, monto: 8400 }] };

    fixture.detectChanges();
    await responder([pago], [paga]);

    expect(botonRegistrar()?.disabled).toBe(true);
  });

  // La plata la cobra el complejo: al cliente la pantalla le sirve para mirar.
  it('al cliente no le ofrece registrar ni le muestra las acciones', async () => {
    TestBed.resetTestingModule();
    await preparar(USUARIO_CLIENTE);

    fixture.detectChanges();
    await responder([pago], [reserva]);

    expect(botonRegistrar()).toBeUndefined();
    expect(fixture.componentInstance['columnas']()).not.toContain('acciones');
    expect(fixture.componentInstance['columnas']()).not.toContain('usuario');
  });
});
