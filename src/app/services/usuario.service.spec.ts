import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { UsuarioService } from './usuario.service';
import { environment } from '../../environments/environment';

describe('UsuarioService', () => {
  const url = `${environment.apiUrl}/usuarios`;

  const rol = { id: 2, nombre: 'CLIENTE' };

  let service: UsuarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(UsuarioService);
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
        nombre: 'Juan Pérez',
        email: 'juan@ejemplo.com',
        telefono: '341 555-1234',
        activo: true,
        rolId: rol.id,
        rol: rol
      }
    ];
    let recibidos: unknown;

    service.listar().subscribe((usuarios) => (recibidos = usuarios));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(esperados);

    expect(recibidos).toEqual(esperados);
  });

  it('envía el alta con el rol como id y sin el objeto anidado', () => {
    const dto = {
      nombre: 'Juan Pérez',
      email: 'juan@ejemplo.com',
      contrasena: 'secreta123',
      telefono: '341 555-1234',
      activo: true,
      rolId: rol.id
    };

    service.crear(dto).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 7, ...dto });
  });

  it('apunta al recurso por id al actualizar y eliminar', () => {
    const dto = {
      nombre: 'Juan I. Pérez',
      email: 'juan@ejemplo.com',
      telefono: '341 555-1234',
      activo: false,
      rolId: rol.id
    };

    service.actualizar(3, dto).subscribe();
    const reqPut = httpMock.expectOne(`${url}/3`);
    expect(reqPut.request.method).toBe('PUT');
    reqPut.flush({ id: 3, ...dto });

    service.eliminar(3).subscribe();
    const reqDelete = httpMock.expectOne(`${url}/3`);
    expect(reqDelete.request.method).toBe('DELETE');
    reqDelete.flush({ mensaje: 'Usuario eliminado correctamente' });
  });
});
