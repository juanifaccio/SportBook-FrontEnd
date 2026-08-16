import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { GestionReservasComponent } from './gestion-reservas';
import { environment } from '../../../environments/environment';

describe('GestionReservasComponent', () => {
  const urlReservas = `${environment.apiUrl}/reservas`;
  const urlCanchas = `${environment.apiUrl}/canchas`;

  const cancha = {
    id: 12,
    nombre: 'Cancha 3',
    precioPorHora: 4200,
    estado: 'DISPONIBLE' as const,
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

  /** Una reserva a futuro, que es la única que se puede gestionar. */
  const reserva = {
    id: 1,
    fecha: '2099-08-20',
    horaInicio: '11:00',
    horaFin: '13:00',
    estado: 'CONFIRMADA' as const,
    precioTotal: 8400,
    usuarioId: usuario.id,
    canchaId: cancha.id,
    horarioId: 2,
    usuario: usuario,
    cancha: cancha
  };

  /** Una que ya pasó: el backend la rechazaría, así que la vista la bloquea. */
  const reservaVieja = { ...reserva, id: 2, fecha: '2020-01-01' };

  const reservaCancelada = { ...reserva, id: 3, estado: 'CANCELADA' as const };

  let fixture: ComponentFixture<GestionReservasComponent>;
  let httpMock: HttpTestingController;

  /** La pantalla pide las reservas y las canchas del filtro a la vez. */
  const responder = async (reservas: unknown[]) => {
    httpMock.expectOne((pedido) => pedido.url === urlReservas).flush(reservas);
    httpMock.expectOne(urlCanchas).flush([cancha]);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionReservasComponent, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(GestionReservasComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', async () => {
    fixture.detectChanges();
    await responder([reserva]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra las reservas con su cancha, su usuario y su estado', async () => {
    fixture.detectChanges();
    await responder([reserva]);

    expect(texto()).toContain(cancha.nombre);
    expect(texto()).toContain(usuario.nombre);
    expect(texto()).toContain('Confirmada');
  });

  it('avisa cuando todavía no hay ninguna reserva', async () => {
    fixture.detectChanges();
    await responder([]);

    expect(texto()).toContain('Todavía no hay reservas');
  });

  it('distingue la lista vacía por los filtros de la lista vacía de verdad', async () => {
    fixture.detectChanges();
    await responder([reserva]);

    fixture.componentInstance['alCambiarEstado']('CANCELADA');

    const req = httpMock.expectOne((pedido) => pedido.url === urlReservas);
    // El filtrado lo hace el backend, no la lista en memoria.
    expect(req.request.params.get('estado')).toBe('CANCELADA');
    req.flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('Ninguna reserva coincide con los filtros');
  });

  it('manda los filtros de cancha y día al backend', async () => {
    fixture.detectChanges();
    await responder([reserva]);

    fixture.componentInstance['alCambiarCancha'](cancha.id);
    const porCancha = httpMock.expectOne((pedido) => pedido.url === urlReservas);
    expect(porCancha.request.params.get('canchaId')).toBe(`${cancha.id}`);
    porCancha.flush([reserva]);
    await fixture.whenStable();

    fixture.componentInstance['alCambiarFecha']('2099-08-20');
    const porFecha = httpMock.expectOne((pedido) => pedido.url === urlReservas);
    expect(porFecha.request.params.get('fecha')).toBe('2099-08-20');
    expect(porFecha.request.params.get('canchaId')).toBe(`${cancha.id}`);
    porFecha.flush([reserva]);
    await fixture.whenStable();
  });

  it('no deja gestionar una reserva cancelada ni una que ya empezó', async () => {
    fixture.detectChanges();
    await responder([reserva, reservaVieja, reservaCancelada]);

    // Son las mismas dos reglas que aplica el backend.
    expect(fixture.componentInstance['esGestionable'](reserva)).toBe(true);
    expect(fixture.componentInstance['esGestionable'](reservaVieja)).toBe(false);
    expect(fixture.componentInstance['esGestionable'](reservaCancelada)).toBe(false);

    expect(fixture.componentInstance['motivoNoGestionable'](reservaCancelada)).toContain(
      'cancelada'
    );
    expect(fixture.componentInstance['motivoNoGestionable'](reservaVieja)).toContain('ya empezó');
  });

  it('cancela la reserva y refleja el estado que devolvió el backend', async () => {
    fixture.detectChanges();
    await responder([reserva]);

    fixture.componentInstance['cancelar'](reserva.id);

    const req = httpMock.expectOne(`${urlReservas}/${reserva.id}/cancelar`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...reserva, estado: 'CANCELADA' });
    await fixture.whenStable();
    fixture.detectChanges();

    // No se vuelve a pedir el listado: el backend ya devolvió la reserva.
    expect(texto()).toContain('Cancelada');
  });

  it('saca de la lista la reserva que dejó de cumplir el filtro activo', async () => {
    fixture.detectChanges();
    await responder([reserva]);

    fixture.componentInstance['alCambiarEstado']('CONFIRMADA');
    httpMock.expectOne((pedido) => pedido.url === urlReservas).flush([reserva]);
    await fixture.whenStable();

    fixture.componentInstance['cancelar'](reserva.id);
    httpMock
      .expectOne(`${urlReservas}/${reserva.id}/cancelar`)
      .flush({ ...reserva, estado: 'CANCELADA' });
    await fixture.whenStable();
    fixture.detectChanges();

    // Se estaban mirando solo las confirmadas: mostrarla ahí sería mentir.
    expect(fixture.componentInstance['reservas']()).toEqual([]);
  });

  it('muestra el error con reintento si falla la carga', async () => {
    fixture.detectChanges();

    httpMock.expectOne(urlCanchas).flush([cancha]);
    httpMock
      .expectOne((pedido) => pedido.url === urlReservas)
      .flush({ mensaje: 'Error al listar las reservas' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('No se pudieron cargar las reservas');
  });
});
