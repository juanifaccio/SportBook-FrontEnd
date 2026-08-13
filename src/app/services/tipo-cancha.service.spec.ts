import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TipoCanchaService } from './tipo-cancha.service';
import { environment } from '../../environments/environment';

describe('TipoCanchaService', () => {
  const url = `${environment.apiUrl}/tipos-cancha`;

  let service: TipoCanchaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(TipoCanchaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('pide el listado al endpoint del ambiente', () => {
    const esperados = [{ id: 1, nombre: 'Fútbol 5', descripcion: 'Césped sintético' }];
    let recibidos: unknown;

    service.listar().subscribe((tipos) => (recibidos = tipos));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(esperados);

    expect(recibidos).toEqual(esperados);
  });

  it('envía el alta sin id en el cuerpo', () => {
    const dto = { nombre: 'Paddle', descripcion: 'Cancha de paddle techada' };

    service.crear(dto).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 7, ...dto });
  });

  it('apunta al recurso por id al actualizar y eliminar', () => {
    service.actualizar(3, { nombre: 'Tenis', descripcion: 'Polvo de ladrillo' }).subscribe();
    const reqPut = httpMock.expectOne(`${url}/3`);
    expect(reqPut.request.method).toBe('PUT');
    reqPut.flush({ id: 3, nombre: 'Tenis', descripcion: 'Polvo de ladrillo' });

    service.eliminar(3).subscribe();
    const reqDelete = httpMock.expectOne(`${url}/3`);
    expect(reqDelete.request.method).toBe('DELETE');
    reqDelete.flush({ mensaje: 'Tipo de cancha eliminado correctamente' });
  });
});
