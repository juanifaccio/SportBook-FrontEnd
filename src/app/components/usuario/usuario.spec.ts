import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { UsuarioComponent } from './usuario';
import { environment } from '../../../environments/environment';

describe('UsuarioComponent', () => {
  const urlUsuarios = `${environment.apiUrl}/usuarios`;
  const urlRoles = `${environment.apiUrl}/roles`;

  const rol = { id: 2, nombre: 'CLIENTE' };

  const usuario = {
    id: 1,
    nombre: 'Juan Pérez',
    email: 'juan@ejemplo.com',
    telefono: '341 555-1234',
    activo: true,
    rolId: rol.id,
    rol: rol
  };

  let fixture: ComponentFixture<UsuarioComponent>;
  let httpMock: HttpTestingController;

  /** La pantalla carga los usuarios y los roles juntos, así que hay dos requests. */
  const responder = (usuarios: unknown[], roles: unknown[]) => {
    httpMock.expectOne(urlUsuarios).flush(usuarios);
    httpMock.expectOne(urlRoles).flush(roles);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuarioComponent, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    fixture.detectChanges();
    responder([], [rol]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra los usuarios que devuelve el backend con su rol traducido', async () => {
    fixture.detectChanges();

    responder([usuario], [rol]);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Juan Pérez');
    expect(texto).toContain('juan@ejemplo.com');
    expect(texto).toContain('Cliente');
    expect(texto).toContain('Activo');
  });

  it('distingue a los usuarios dados de baja', async () => {
    fixture.detectChanges();

    responder([{ ...usuario, activo: false }], [rol]);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Inactivo');
  });

  it('muestra el estado vacío cuando no hay usuarios cargados', async () => {
    fixture.detectChanges();

    responder([], [rol]);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Todavía no hay usuarios');
  });

  it('ofrece reintentar cuando la carga falla', async () => {
    fixture.detectChanges();

    // El listado de roles se responde primero para que el de usuarios pueda
    // fallar sin dejar el otro request cancelado a mitad de camino.
    httpMock.expectOne(urlRoles).flush([rol]);
    httpMock.expectOne(urlUsuarios).flush(
      { mensaje: 'Error interno' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reintentar');
  });
});
