import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HorarioService } from './horario.service';
import { environment } from '../../environments/environment';

describe('HorarioService', () => {
  const url = `${environment.apiUrl}/horarios`;

  const dto = {
    fecha: '2026-08-20',
    horaInicio: '10:00',
    horaFin: '11:00',
    disponible: true,
    canchaId: 3
  };

  let service: HorarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(HorarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('pide el listado al endpoint del ambiente', () => {
    let recibidos: unknown;

    service.listar().subscribe((horarios) => (recibidos = horarios));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, ...dto }]);

    expect(recibidos).toEqual([{ id: 1, ...dto }]);
  });

  it('filtra por cancha cuando se le pasa una', () => {
    service.listar(3).subscribe();

    const req = httpMock.expectOne(`${url}?canchaId=3`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('canchaId')).toBe('3');
    req.flush([]);
  });

  it('pide solo los turnos libres de una cancha y un día', () => {
    service.listarDisponibles(3, '2026-08-20').subscribe();

    const req = httpMock.expectOne(
      (pedido) => pedido.url === url && pedido.params.has('disponible')
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('canchaId')).toBe('3');
    expect(req.request.params.get('fecha')).toBe('2026-08-20');
    expect(req.request.params.get('disponible')).toBe('true');
    req.flush([]);
  });

  it('envía el alta con la cancha como id y sin el objeto anidado', () => {
    service.crear(dto).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 7, ...dto });
  });

  it('manda la generación en lote a su propio endpoint', () => {
    const lote = {
      fecha: '2026-08-20',
      horaInicio: '08:00',
      horaFin: '12:00',
      canchaId: 3,
      duracion: 60
    };

    let recibido: unknown;

    service.generar(lote).subscribe((resultado) => (recibido = resultado));

    const req = httpMock.expectOne(`${url}/lote`);
    expect(req.request.method).toBe('POST');
    // El cuerpo va tal cual: el rango y la duración son del lote, no de un turno.
    expect(req.request.body).toEqual(lote);

    const respuesta = { creados: [{ id: 1, ...dto }], omitidos: 2 };
    req.flush(respuesta);

    expect(recibido).toEqual(respuesta);
  });

  it('apunta al recurso por id al actualizar y eliminar', () => {
    service.actualizar(3, dto).subscribe();
    const reqPut = httpMock.expectOne(`${url}/3`);
    expect(reqPut.request.method).toBe('PUT');
    reqPut.flush({ id: 3, ...dto });

    service.eliminar(3).subscribe();
    const reqDelete = httpMock.expectOne(`${url}/3`);
    expect(reqDelete.request.method).toBe('DELETE');
    reqDelete.flush({ mensaje: 'Horario eliminado correctamente' });
  });
});
