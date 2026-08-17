import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import {
  TOKEN_DE_PRUEBA,
  USUARIO_ADMIN,
  cerrarSesionDePrueba,
  iniciarSesionDePrueba
} from '../testing/sesion';

describe('authInterceptor', () => {
  const url = `${environment.apiUrl}/canchas`;
  const urlLogin = `${environment.apiUrl}/auth/login`;

  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  const preparar = () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        // Cerrar sesión navega al login: sin la ruta declarada, la navegación
        // fallaría por un motivo ajeno a lo que se está probando.
        provideRouter([{ path: 'login', children: [] }])
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  };

  afterEach(() => {
    httpMock.verify();
    cerrarSesionDePrueba();
  });

  it('sin sesión no manda la cabecera', () => {
    preparar();

    http.get(url).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('con sesión adjunta el token en cada pedido', () => {
    iniciarSesionDePrueba(USUARIO_ADMIN);
    preparar();

    http.get(url).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN_DE_PRUEBA}`);
    req.flush([]);
  });

  it('ante un 401 cierra la sesión', () => {
    iniciarSesionDePrueba(USUARIO_ADMIN);
    preparar();

    expect(auth.autenticado()).toBe(true);

    http.get(url).subscribe({ error: () => {} });

    httpMock
      .expectOne(url)
      .flush({ mensaje: 'La sesión expiró' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.autenticado()).toBe(false);
  });

  it('ante un 403 mantiene la sesión', () => {
    iniciarSesionDePrueba(USUARIO_ADMIN);
    preparar();

    http.get(url).subscribe({ error: () => {} });

    httpMock
      .expectOne(url)
      .flush({ mensaje: 'No tenés permisos' }, { status: 403, statusText: 'Forbidden' });

    // Un permiso que falta no es una sesión vencida: echarlo por eso lo dejaría
    // afuera de todo lo que sí puede hacer.
    expect(auth.autenticado()).toBe(true);
  });

  it('el 401 del propio login no cierra nada', () => {
    iniciarSesionDePrueba(USUARIO_ADMIN);
    preparar();

    http.post(urlLogin, {}).subscribe({ error: () => {} });

    httpMock
      .expectOne(urlLogin)
      .flush(
        { mensaje: 'Email o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' }
      );

    // Ahí el 401 significa "esa contraseña no es", no "tu sesión venció".
    expect(auth.autenticado()).toBe(true);
  });
});
