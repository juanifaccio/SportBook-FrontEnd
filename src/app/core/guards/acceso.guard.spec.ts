import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter
} from '@angular/router';

import { adminGuard, invitadoGuard, sesionGuard } from './acceso.guard';
import { environment } from '../../../environments/environment';
import {
  USUARIO_ADMIN,
  USUARIO_CLIENTE,
  cerrarSesionDePrueba,
  iniciarSesionDePrueba
} from '../testing/sesion';

describe('guards de acceso', () => {
  let httpMock: HttpTestingController;

  const preparar = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });

    httpMock = TestBed.inject(HttpTestingController);
  };

  /** El guard corre en el contexto de inyección, como lo llama el router. */
  const correr = (guard: typeof sesionGuard, url = '/canchas') =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url: url } as RouterStateSnapshot)
    );

  afterEach(() => {
    httpMock.verify();
    cerrarSesionDePrueba();
  });

  describe('sesionGuard', () => {
    it('deja pasar con sesión iniciada', () => {
      iniciarSesionDePrueba(USUARIO_CLIENTE);
      preparar();

      expect(correr(sesionGuard)).toBe(true);
    });

    it('sin sesión manda al login y se acuerda de a dónde iba', () => {
      preparar();

      const destino = correr(sesionGuard, '/horarios');

      expect(destino).toBeInstanceOf(UrlTree);
      expect(String(destino)).toContain('/login');
      expect(String(destino)).toContain('volverA');
    });
  });

  describe('adminGuard', () => {
    it('deja pasar al administrador', () => {
      iniciarSesionDePrueba(USUARIO_ADMIN);
      preparar();

      expect(correr(adminGuard)).toBe(true);
    });

    it('al cliente lo devuelve a reservar', () => {
      iniciarSesionDePrueba(USUARIO_CLIENTE);
      preparar();

      expect(String(correr(adminGuard))).toBe('/reservar');
    });
  });

  describe('invitadoGuard', () => {
    it('deja ver el login a quien no inició sesión', () => {
      preparar();

      expect(correr(invitadoGuard, '/login')).toBe(true);
    });

    it('a quien ya entró lo saca del login', () => {
      iniciarSesionDePrueba(USUARIO_ADMIN);
      preparar();

      expect(String(correr(invitadoGuard, '/login'))).toBe('/reservar');
    });
  });
});
