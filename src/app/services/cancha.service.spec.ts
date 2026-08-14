import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CanchaService } from './cancha.service';
import { environment } from '../../environments/environment';

describe('CanchaService', () => {
  const url = `${environment.apiUrl}/canchas`;

  let service: CanchaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(CanchaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('pide el listado al endpoint del ambiente', () => {
    const esperados = [
      {
        id: 1,
        nombre: 'Cancha 1',
        precioPorHora: 8500,
        estado: 'DISPONIBLE' as const,
        tipoCanchaId: 2,
        tipoCancha: { id: 2, nombre: 'Fútbol 5', descripcion: 'Césped sintético' }
      }
    ];
    let recibidas: unknown;

    service.listar().subscribe((canchas) => (recibidas = canchas));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(esperados);

    expect(recibidas).toEqual(esperados);
  });

  it('envía el alta con el tipo como id y sin el objeto anidado', () => {
    const dto = {
      nombre: 'Cancha 2',
      precioPorHora: 9000,
      estado: 'DISPONIBLE' as const,
      tipoCanchaId: 2
    };

    service.crear(dto).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 7, ...dto });
  });

  it('apunta al recurso por id al actualizar y eliminar', () => {
    const dto = {
      nombre: 'Cancha 3',
      precioPorHora: 7000,
      estado: 'MANTENIMIENTO' as const,
      tipoCanchaId: 2
    };

    service.actualizar(3, dto).subscribe();
    const reqPut = httpMock.expectOne(`${url}/3`);
    expect(reqPut.request.method).toBe('PUT');
    reqPut.flush({ id: 3, ...dto });

    service.eliminar(3).subscribe();
    const reqDelete = httpMock.expectOne(`${url}/3`);
    expect(reqDelete.request.method).toBe('DELETE');
    reqDelete.flush({ mensaje: 'Cancha eliminada correctamente' });
  });
});
