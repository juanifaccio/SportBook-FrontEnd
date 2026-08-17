import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService, CLAVE_TOKEN, CLAVE_USUARIO } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  TOKEN_DE_PRUEBA,
  USUARIO_ADMIN,
  USUARIO_CLIENTE,
  cerrarSesionDePrueba,
  iniciarSesionDePrueba
} from '../testing/sesion';

describe('AuthService', () => {
  const url = `${environment.apiUrl}/auth`;

  let service: AuthService;
  let httpMock: HttpTestingController;

  /**
   * El router se reemplaza por un doble que anota a dónde se le pidió ir. Lo que
   * interesa acá es que cerrar sesión mande al login, no cómo el router resuelve
   * esa navegación.
   */
  let navegaciones: unknown[][];
  const router = {
    navigate: (comandos: unknown[]) => {
      navegaciones.push(comandos);
      return Promise.resolve(true);
    }
  };

  /**
   * El servicio lee la sesión guardada al construirse, así que hay que dejarla
   * armada —o no— antes de pedirlo.
   */
  const preparar = () => {
    navegaciones = [];

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpMock.verify();
    cerrarSesionDePrueba();
  });

  it('sin nada guardado arranca sin sesión', () => {
    preparar();

    expect(service.autenticado()).toBe(false);
    expect(service.esAdmin()).toBe(false);
    expect(service.usuario()).toBeNull();
    expect(service.token).toBeNull();
  });

  it('guarda el token y el usuario al iniciar sesión', () => {
    preparar();

    service.iniciarSesion({ email: 'admin@sportbook.com', contrasena: 'admin1234' }).subscribe();

    const req = httpMock.expectOne(`${url}/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ token: TOKEN_DE_PRUEBA, usuario: USUARIO_ADMIN });

    expect(service.autenticado()).toBe(true);
    expect(service.esAdmin()).toBe(true);
    expect(service.usuario()).toEqual(USUARIO_ADMIN);
    // Guardado, para que recargar la página no obligue a entrar de nuevo.
    expect(localStorage.getItem(CLAVE_TOKEN)).toBe(TOKEN_DE_PRUEBA);
  });

  it('un cliente queda autenticado pero no es administrador', () => {
    iniciarSesionDePrueba(USUARIO_CLIENTE);
    preparar();

    expect(service.autenticado()).toBe(true);
    expect(service.esAdmin()).toBe(false);
  });

  it('recupera la sesión guardada y la revalida contra el backend', () => {
    iniciarSesionDePrueba(USUARIO_CLIENTE);
    preparar();

    // Antes de que conteste el backend ya vale la copia guardada: la pantalla no
    // tiene que esperar un viaje de red para saber quién está conectado.
    expect(service.usuario()).toEqual(USUARIO_CLIENTE);

    service.restaurar();

    // Al usuario le cambiaron el rol desde la última vez: manda lo que dice el
    // backend, no la copia del navegador.
    httpMock.expectOne(`${url}/yo`).flush({ ...USUARIO_CLIENTE, rol: USUARIO_ADMIN.rol });

    expect(service.esAdmin()).toBe(true);
  });

  it('sin token no pide el perfil al restaurar', () => {
    preparar();

    service.restaurar();

    // `httpMock.verify()` del afterEach falla si salió algún pedido.
    expect(service.autenticado()).toBe(false);
  });

  it('descarta una sesión guardada a medias', () => {
    localStorage.setItem(CLAVE_TOKEN, TOKEN_DE_PRUEBA);
    localStorage.setItem(CLAVE_USUARIO, '{esto no es json');

    preparar();

    // Ante la duda, no hay sesión: como mucho obliga a entrar otra vez.
    expect(service.autenticado()).toBe(false);
  });

  it('al cerrar sesión borra todo y vuelve al login', () => {
    iniciarSesionDePrueba(USUARIO_ADMIN);
    preparar();

    service.cerrarSesion();

    expect(service.autenticado()).toBe(false);
    expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
    expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
    expect(navegaciones).toEqual([['/login']]);
  });
});
