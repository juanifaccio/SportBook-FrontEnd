import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PagoService } from './pago.service';
import { environment } from '../../environments/environment';

describe('PagoService', () => {
  const url = `${environment.apiUrl}/pagos`;

  const dto = { reservaId: 8, monto: 5000, metodo: 'EFECTIVO' as const };

  let service: PagoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(PagoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('pide el listado al endpoint del ambiente', () => {
    const esperados = [{ id: 1, ...dto, fecha: '2026-08-20', estado: 'REGISTRADO' }];
    let recibidos: unknown;

    service.listar().subscribe((pagos) => (recibidos = pagos));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(esperados);

    expect(recibidos).toEqual(esperados);
  });

  it('filtra por reserva y por estado', () => {
    service.listar({ reservaId: 8, estado: 'ANULADO' }).subscribe();

    const req = httpMock.expectOne((pedido) => pedido.url === url);
    expect(req.request.params.get('reservaId')).toBe('8');
    expect(req.request.params.get('estado')).toBe('ANULADO');
    req.flush([]);
  });

  it('envía el alta sin fecha ni estado', () => {
    service.crear(dto).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 7, ...dto, fecha: '2026-08-20', estado: 'REGISTRADO' });
  });

  it('al actualizar manda solamente el método', () => {
    service.actualizar(3, { metodo: 'TARJETA' }).subscribe();

    const req = httpMock.expectOne(`${url}/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ metodo: 'TARJETA' });
    req.flush({ id: 3, ...dto, metodo: 'TARJETA' });
  });

  it('anula con un PUT a su propia URL y sin cuerpo', () => {
    service.anular(3).subscribe();

    const req = httpMock.expectOne(`${url}/3/anular`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush({ id: 3, ...dto, estado: 'ANULADO' });
  });
});
