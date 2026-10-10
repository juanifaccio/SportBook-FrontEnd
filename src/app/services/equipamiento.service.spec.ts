import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { EquipamientoService } from './equipamiento.service';
import { environment } from '../../environments/environment';

describe('EquipamientoService', () => {
  const url = `${environment.apiUrl}/equipamientos`;

  let service: EquipamientoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(EquipamientoService);
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
      { id: 1, nombre: 'Pelota de fútbol', descripcion: 'Número 5', precio: 1500, stock: 10 }
    ];
    let recibidos: unknown;

    service.listar().subscribe((equipamientos) => (recibidos = equipamientos));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(esperados);

    expect(recibidos).toEqual(esperados);
  });

  it('envía el alta sin id en el cuerpo', () => {
    const dto = { nombre: 'Pechera', descripcion: 'Talle único', precio: 800, stock: 4 };

    service.crear(dto).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 7, ...dto });
  });

  it('apunta al recurso por id al actualizar y eliminar', () => {
    const dto = { nombre: 'Paleta', descripcion: 'De pádel', precio: 2000, stock: 6 };

    service.actualizar(3, dto).subscribe();
    const reqPut = httpMock.expectOne(`${url}/3`);
    expect(reqPut.request.method).toBe('PUT');
    reqPut.flush({ id: 3, ...dto });

    service.eliminar(3).subscribe();
    const reqDelete = httpMock.expectOne(`${url}/3`);
    expect(reqDelete.request.method).toBe('DELETE');
    reqDelete.flush({ mensaje: 'Equipamiento eliminado correctamente' });
  });

  it('no agrega parámetros de query al listar sin turno', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });

  it('pide las unidades libres de un turno con horarioId', () => {
    service.listar(7).subscribe();

    const req = httpMock.expectOne((pedido) => pedido.url === url);
    expect(req.request.params.get('horarioId')).toBe('7');
    req.flush([]);
  });
});
