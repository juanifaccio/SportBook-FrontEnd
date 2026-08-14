import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ReservaService } from './reserva.service';
import { environment } from '../../environments/environment';

describe('ReservaService', () => {
  const url = `${environment.apiUrl}/reservas`;

  const reserva = {
    id: 1,
    fecha: '2026-08-20',
    horaInicio: '11:00',
    horaFin: '12:00',
    estado: 'CONFIRMADA' as const,
    precioTotal: 4200,
    usuarioId: 6,
    canchaId: 12,
    horarioId: 2
  };

  let service: ReservaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(ReservaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('pide el listado al endpoint del ambiente', () => {
    let recibidas: unknown;

    service.listar().subscribe((reservas) => (recibidas = reservas));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush([reserva]);

    expect(recibidas).toEqual([reserva]);
  });

  it('manda solo los filtros que recibe', () => {
    service.listar({ usuarioId: 6, fecha: '2026-08-20' }).subscribe();

    const req = httpMock.expectOne(
      (pedido) => pedido.url === url && pedido.params.has('usuarioId')
    );
    expect(req.request.params.get('usuarioId')).toBe('6');
    expect(req.request.params.get('fecha')).toBe('2026-08-20');
    expect(req.request.params.has('canchaId')).toBe(false);
    req.flush([]);
  });

  it('envía solo el turno y el usuario al reservar', () => {
    service.crear({ horarioId: 2, usuarioId: 6 }).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    // La fecha, las horas, la cancha y el precio los deriva el backend del turno.
    expect(req.request.body).toEqual({ horarioId: 2, usuarioId: 6 });
    req.flush(reserva);
  });

  it('apunta al recurso por id al obtener una', () => {
    service.obtener(1).subscribe();

    const req = httpMock.expectOne(`${url}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(reserva);
  });
});
