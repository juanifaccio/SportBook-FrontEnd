import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { LoginComponent } from './login';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { TOKEN_DE_PRUEBA, USUARIO_ADMIN, cerrarSesionDePrueba } from '../../core/testing/sesion';

describe('LoginComponent', () => {
  const url = `${environment.apiUrl}/auth/login`;

  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;

  const campo = (nombre: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      `input[formcontrolname="${nombre}"]`
    );

  const botonEntrar = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find((boton) => boton.textContent?.includes('Iniciar sesión'));

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  /** Escribe las credenciales como lo haría el usuario y manda el formulario. */
  const entrar = async (email: string, contrasena: string) => {
    fixture.componentInstance['formulario'].setValue({ email: email, contrasena: contrasena });
    fixture.detectChanges();

    botonEntrar()?.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // Entrar navega a reservar; sin la ruta declarada la navegación fallaría
        // por un motivo ajeno a lo que se está probando.
        provideRouter([{ path: 'reservar', children: [] }])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    cerrarSesionDePrueba();
  });

  it('se crea correctamente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('no manda nada con el formulario vacío y marca los campos', async () => {
    botonEntrar()?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('El email es obligatorio');
    expect(texto()).toContain('La contraseña es obligatoria');
  });

  it('avisa si el email no tiene formato válido', async () => {
    fixture.componentInstance['formulario'].setValue({ email: 'no-es-un-email', contrasena: 'x' });
    fixture.componentInstance['formulario'].markAllAsTouched();
    fixture.detectChanges();

    expect(texto()).toContain('Escribí un email válido');
  });

  it('inicia sesión y entra a la aplicación', async () => {
    await entrar('admin@sportbook.com', 'admin1234');

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'admin@sportbook.com',
      contrasena: 'admin1234'
    });
    req.flush({ token: TOKEN_DE_PRUEBA, usuario: USUARIO_ADMIN });
    await fixture.whenStable();

    expect(TestBed.inject(AuthService).autenticado()).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/reservar');
  });

  it('si las credenciales no sirven, deja reintentar sin perder lo escrito', async () => {
    await entrar('admin@sportbook.com', 'la-que-no-era');

    httpMock
      .expectOne(url)
      .flush(
        { mensaje: 'Email o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' }
      );
    await fixture.whenStable();
    fixture.detectChanges();

    // El mensaje lo muestra el interceptor de errores; lo que le toca a la
    // pantalla es devolver el control con los datos todavía cargados.
    expect(TestBed.inject(AuthService).autenticado()).toBe(false);
    expect(botonEntrar()?.disabled).toBe(false);
    expect(campo('email')?.value).toBe('admin@sportbook.com');
  });

  it('la contraseña se puede mostrar y volver a ocultar', () => {
    expect(campo('contrasena')?.type).toBe('password');

    fixture.componentInstance['alternarContrasena']();
    fixture.detectChanges();

    expect(campo('contrasena')?.type).toBe('text');
  });
});
