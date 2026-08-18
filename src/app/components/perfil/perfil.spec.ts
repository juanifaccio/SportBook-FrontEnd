import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PerfilComponent } from './perfil';
import { environment } from '../../../environments/environment';
import {
  USUARIO_CLIENTE,
  cerrarSesionDePrueba,
  iniciarSesionDePrueba
} from '../../core/testing/sesion';

describe('PerfilComponent', () => {
  const url = `${environment.apiUrl}/auth`;

  let fixture: ComponentFixture<PerfilComponent>;
  let httpMock: HttpTestingController;

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const boton = (etiqueta: string) =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find((candidato) => candidato.textContent?.includes(etiqueta));

  beforeEach(async () => {
    // La pantalla se llena con el usuario de la sesión, así que hay que armarla
    // antes del `TestBed`: `AuthService` la lee al construirse.
    iniciarSesionDePrueba(USUARIO_CLIENTE);

    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    cerrarSesionDePrueba();
  });

  // El usuario ya está en memoria desde el login: la pantalla no lo pide, y
  // `httpMock.verify()` del afterEach falla si saliera algún pedido.
  it('se llena con el usuario de la sesión sin pedirlo al backend', () => {
    const datos = fixture.componentInstance['datosFormulario'].getRawValue();

    expect(datos.nombre).toBe(USUARIO_CLIENTE.nombre);
    expect(datos.email).toBe(USUARIO_CLIENTE.email);
    expect(datos.telefono).toBe(USUARIO_CLIENTE.telefono);
  });

  // Se muestran pero no se editan: los administra el complejo.
  it('muestra el nivel de acceso y el estado de la cuenta como solo lectura', () => {
    expect(texto()).toContain('Cliente');
    expect(texto()).toContain('Activa');

    const controles = fixture.componentInstance['datosFormulario'].controls;

    expect('rolId' in controles).toBe(false);
    expect('activo' in controles).toBe(false);
  });

  it('guarda los datos y avisa', async () => {
    fixture.componentInstance['datosFormulario'].controls.telefono.setValue('341 555-1111');

    boton('Guardar cambios')?.click();
    await fixture.whenStable();

    const req = httpMock.expectOne(`${url}/yo`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      nombre: USUARIO_CLIENTE.nombre,
      email: USUARIO_CLIENTE.email,
      telefono: '341 555-1111'
    });
    req.flush({ ...USUARIO_CLIENTE, telefono: '341 555-1111' });
    await fixture.whenStable();

    expect(fixture.componentInstance['guardandoDatos']()).toBe(false);
  });

  it('no manda nada si los datos están incompletos', async () => {
    fixture.componentInstance['datosFormulario'].controls.email.setValue('sin-arroba');

    boton('Guardar cambios')?.click();
    await fixture.whenStable();

    // `httpMock.verify()` del afterEach falla si hubiera salido algún pedido.
    expect(fixture.componentInstance['guardandoDatos']()).toBe(false);
  });

  it('cambia la contraseña con la actual y vacía el formulario', async () => {
    const formulario = fixture.componentInstance['contrasenaFormulario'];

    formulario.setValue({ contrasenaActual: 'unaClave123', contrasenaNueva: 'otraClave456' });
    fixture.detectChanges();

    boton('Cambiar la contraseña')?.click();
    await fixture.whenStable();

    const req = httpMock.expectOne(`${url}/yo/contrasena`);
    expect(req.request.body).toEqual({
      contrasenaActual: 'unaClave123',
      contrasenaNueva: 'otraClave456'
    });
    req.flush({ mensaje: 'Contraseña actualizada correctamente' });
    await fixture.whenStable();

    // Dejar las contraseñas escritas en pantalla después de guardarlas no le
    // sirve a nadie.
    expect(formulario.controls.contrasenaActual.value).toBe('');
    expect(formulario.controls.contrasenaNueva.value).toBe('');
  });

  it('no manda una contraseña nueva más corta que el mínimo', async () => {
    fixture.componentInstance['contrasenaFormulario'].setValue({
      contrasenaActual: 'unaClave123',
      contrasenaNueva: 'corta'
    });

    boton('Cambiar la contraseña')?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance['guardandoContrasena']()).toBe(false);
  });

  // El backend responde 400 y no 401 justamente para que la sesión sobreviva a
  // un error de tipeo: el formulario tiene que quedar como estaba.
  it('si la contraseña actual es incorrecta, no vacía el formulario', async () => {
    const formulario = fixture.componentInstance['contrasenaFormulario'];

    formulario.setValue({ contrasenaActual: 'no-es-esta', contrasenaNueva: 'otraClave456' });

    boton('Cambiar la contraseña')?.click();
    await fixture.whenStable();

    httpMock
      .expectOne(`${url}/yo/contrasena`)
      .flush(
        { mensaje: 'La contraseña actual no es correcta' },
        { status: 400, statusText: 'Bad Request' }
      );
    await fixture.whenStable();

    expect(formulario.controls.contrasenaNueva.value).toBe('otraClave456');
    expect(fixture.componentInstance['guardandoContrasena']()).toBe(false);
  });
});
