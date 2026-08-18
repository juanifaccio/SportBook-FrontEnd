import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { EventoService } from './evento.service';
import { environment } from '../../environments/environment';

describe('EventoService', () => {
  const url = `${environment.apiUrl}/eventos`;

  const dto = {
    descripcion: 'Cumpleaños de 15',
    cantidadPersonas: 40,
    tipoEventoId: 3,
    reservaId: 8
  };

  let service: EventoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(EventoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('pide el listado al endpoint del ambiente', () => {
    const esperados = [{ id: 1, ...dto }];
    let recibidos: unknown;

    service.listar().subscribe((eventos) => (recibidos = eventos));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(esperados);

    expect(recibidos).toEqual(esperados);
  });

  it('filtra por reserva cuando se le pasa una', () => {
    service.listar({ reservaId: 8 }).subscribe();

    const req = httpMock.expectOne((pedido) => pedido.url === url);
    expect(req.request.params.get('reservaId')).toBe('8');
    req.flush([]);
  });

  it('envía el alta sin id en el cuerpo', () => {
    service.crear(dto).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 7, ...dto });
  });

  // Un evento no se muda de reserva, así que el PUT va sin `reservaId`: el
  // backend lo ignoraría igual, pero mandarlo sugeriría que se puede cambiar.
  it('apunta al recurso por id al actualizar y eliminar', () => {
    const edicion = {
      descripcion: 'Cumpleaños de 18',
      cantidadPersonas: 25,
      tipoEventoId: 3
    };

    service.actualizar(3, edicion).subscribe();
    const reqPut = httpMock.expectOne(`${url}/3`);
    expect(reqPut.request.method).toBe('PUT');
    expect(reqPut.request.body).toEqual(edicion);
    reqPut.flush({ id: 3, ...edicion, reservaId: 8 });

    service.eliminar(3).subscribe();
    const reqDelete = httpMock.expectOne(`${url}/3`);
    expect(reqDelete.request.method).toBe('DELETE');
    reqDelete.flush({ mensaje: 'Evento eliminado correctamente' });
  });
});
