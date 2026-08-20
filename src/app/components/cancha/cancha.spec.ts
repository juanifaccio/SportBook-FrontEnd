import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { CanchaComponent } from './cancha';
import { environment } from '../../../environments/environment';

describe('CanchaComponent', () => {
  const urlCanchas = `${environment.apiUrl}/canchas`;
  const urlTipos = `${environment.apiUrl}/tipos-cancha`;

  const tipo = { id: 2, nombre: 'Fútbol 5', descripcion: 'Césped sintético' };
  const padel = { id: 5, nombre: 'Pádel', descripcion: 'Cancha con paredes' };

  const cancha = {
    id: 1,
    nombre: 'Cancha 1',
    precioPorHora: 8500,
    estado: 'DISPONIBLE',
    tipoCanchaId: tipo.id,
    tipoCancha: tipo
  };

  let fixture: ComponentFixture<CanchaComponent>;
  let httpMock: HttpTestingController;

  /** La pantalla carga las canchas y los tipos juntos, así que hay dos requests. */
  const responder = (canchas: unknown[], tipos: unknown[]) => {
    httpMock.expectOne(urlCanchas).flush(canchas);
    httpMock.expectOne(urlTipos).flush(tipos);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanchaComponent, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CanchaComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** El listado filtrado llega con query, así que se lo busca por camino. */
  const pedidoDeCanchas = () => httpMock.expectOne((pedido) => pedido.url === urlCanchas);

  it('se crea correctamente', () => {
    fixture.detectChanges();
    responder([], [tipo]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra las canchas que devuelve el backend con su tipo', async () => {
    fixture.detectChanges();

    responder([cancha], [tipo]);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Cancha 1');
    expect(texto).toContain('Fútbol 5');
    expect(texto).toContain('Disponible');
  });

  it('muestra el estado vacío cuando no hay canchas cargadas', async () => {
    fixture.detectChanges();

    responder([], [tipo]);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Todavía no hay canchas');
  });

  it('avisa que primero hay que crear un tipo de cancha', async () => {
    fixture.detectChanges();

    responder([], []);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Todavía no hay tipos de cancha');
  });

  it('ofrece el filtro con los tipos cargados', async () => {
    fixture.detectChanges();

    responder([cancha], [tipo, padel]);
    await fixture.whenStable();
    fixture.detectChanges();

    // Por el selector y no por su texto: las opciones las dibuja Material en un
    // overlay recién cuando se lo abre, así que en el DOM todavía no están.
    const filtro = (fixture.nativeElement as HTMLElement).querySelector('.filtros mat-select');
    expect(filtro).not.toBeNull();
  });

  it('manda el tipo elegido al backend en vez de filtrar la lista en memoria', async () => {
    fixture.detectChanges();

    responder([cancha], [tipo, padel]);
    await fixture.whenStable();

    fixture.componentInstance['alCambiarTipo'](padel.id);

    const req = pedidoDeCanchas();
    expect(req.request.params.get('tipoCanchaId')).toBe(`${padel.id}`);
    req.flush([]);
    await fixture.whenStable();
  });

  // Sin valor, `tipoCanchaId=` en la query es un filtro inválido para el
  // backend, no la ausencia de filtro.
  it('no manda el parámetro cuando se vuelve a ver todas', async () => {
    fixture.detectChanges();

    responder([cancha], [tipo, padel]);
    await fixture.whenStable();

    fixture.componentInstance['alCambiarTipo'](padel.id);
    pedidoDeCanchas().flush([]);
    await fixture.whenStable();

    fixture.componentInstance['limpiarFiltro']();

    const req = pedidoDeCanchas();
    expect(req.request.params.has('tipoCanchaId')).toBe(false);
    req.flush([cancha]);
    await fixture.whenStable();
  });

  it('distingue la lista vacía por el filtro de la lista vacía de verdad', async () => {
    fixture.detectChanges();

    responder([cancha], [tipo, padel]);
    await fixture.whenStable();

    fixture.componentInstance['alCambiarTipo'](padel.id);
    pedidoDeCanchas().flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ninguna cancha es de Pádel');
    expect(texto).not.toContain('Todavía no hay canchas');
  });

  it('ofrece reintentar cuando la carga falla', async () => {
    fixture.detectChanges();

    // El listado de tipos se responde primero para que el de canchas pueda
    // fallar sin dejar el otro request cancelado a mitad de camino.
    httpMock.expectOne(urlTipos).flush([tipo]);
    httpMock.expectOne(urlCanchas).flush(
      { mensaje: 'Error interno' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reintentar');
  });
});
