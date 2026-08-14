import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RolService } from './rol.service';
import { environment } from '../../environments/environment';

describe('RolService', () => {
  const url = `${environment.apiUrl}/roles`;

  let service: RolService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(RolService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('pide el catálogo al endpoint del ambiente', () => {
    const esperados = [
      { id: 1, nombre: 'ADMIN' },
      { id: 2, nombre: 'CLIENTE' }
    ];
    let recibidos: unknown;

    service.listar().subscribe((roles) => (recibidos = roles));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(esperados);

    expect(recibidos).toEqual(esperados);
  });
});
