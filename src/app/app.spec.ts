import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { App } from './app';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { PROVEEDORES_FECHA } from './core/fecha-adapter';
import {
  USUARIO_ADMIN,
  USUARIO_CLIENTE,
  cerrarSesionDePrueba,
  iniciarSesionDePrueba
} from './core/testing/sesion';

/**
 * La raíz ya no dibuja el layout: ahora solo hospeda al router, y el layout es
 * una ruta más para que el login pueda quedar fuera de él. Así que estos tests
 * navegan de verdad, que además es la única forma de comprobar los guards.
 */
describe('App', () => {
  let httpMock: HttpTestingController;

  const preparar = async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        PROVEEDORES_FECHA
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  };

  /** Navega y deja que el router resuelva la carga diferida del componente. */
  const ir = async (url: string) => {
    const fixture = TestBed.createComponent(App);

    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    fixture.detectChanges();

    return fixture;
  };

  afterEach(() => {
    cerrarSesionDePrueba();
  });

  it('se crea correctamente', async () => {
    await preparar();

    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('sin sesión manda al login cualquier pantalla que se pida', async () => {
    await preparar();

    const fixture = await ir('/canchas');

    expect(TestBed.inject(Router).url).toContain('/login');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Iniciar sesión');
  });

  it('con sesión muestra el layout con la marca y la navegación', async () => {
    iniciarSesionDePrueba(USUARIO_ADMIN);
    await preparar();

    const fixture = await ir('/tipos-cancha');

    // Al arrancar se revalida la sesión guardada contra el backend.
    httpMock.expectOne(`${environment.apiUrl}/auth/yo`).flush(USUARIO_ADMIN);
    httpMock.expectOne(`${environment.apiUrl}/tipos-cancha`).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('SportBook');
    expect(texto).toContain('Tipos de cancha');
  });

  it('al cliente que pide una pantalla de administración lo devuelve a reservar', async () => {
    iniciarSesionDePrueba(USUARIO_CLIENTE);
    await preparar();

    const fixture = await ir('/usuarios');

    httpMock.expectOne(`${environment.apiUrl}/auth/yo`).flush(USUARIO_CLIENTE);

    expect(TestBed.inject(Router).url).toBe('/reservar');

    // El guard lo desvió antes de que el componente de usuarios llegara a
    // pedir nada; lo que sale ahora es la carga de la pantalla de reservar.
    httpMock.match(`${environment.apiUrl}/canchas`).forEach((pedido) => pedido.flush([]));
    expect(httpMock.match(`${environment.apiUrl}/usuarios`)).toHaveLength(0);

    await fixture.whenStable();
  });

  it('el menú no le ofrece al cliente las pantallas de administración', async () => {
    iniciarSesionDePrueba(USUARIO_CLIENTE);
    await preparar();

    const fixture = await ir('/reservar');

    httpMock.expectOne(`${environment.apiUrl}/auth/yo`).flush(USUARIO_CLIENTE);
    httpMock.match(`${environment.apiUrl}/canchas`).forEach((pedido) => pedido.flush([]));
    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reservar');
    expect(texto).not.toContain('Tipos de cancha');
    expect(texto).not.toContain('Usuarios');
  });
});
