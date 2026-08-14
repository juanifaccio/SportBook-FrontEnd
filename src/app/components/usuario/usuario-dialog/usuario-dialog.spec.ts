import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { UsuarioDialogComponent, DatosUsuarioDialog } from './usuario-dialog';
import { UsuarioFormComponent } from '../usuario-form/usuario-form';
import { UsuarioDto } from '../../../models/usuario';
import { environment } from '../../../../environments/environment';

describe('UsuarioDialogComponent', () => {
  const url = `${environment.apiUrl}/usuarios`;

  const rol = { id: 2, nombre: 'CLIENTE' };

  const dto = {
    nombre: 'Juan Pérez',
    email: 'juan@ejemplo.com',
    contrasena: 'secreta123',
    telefono: '341 555-1234',
    activo: true,
    rolId: rol.id
  };

  /** Lo que devuelve el backend: los mismos datos pero sin la contraseña. */
  const { contrasena, ...sinContrasena } = dto;
  const usuario = { id: 1, ...sinContrasena, rol: rol };

  let fixture: ComponentFixture<UsuarioDialogComponent>;
  let httpMock: HttpTestingController;

  /** Reemplaza al `MatDialogRef` real para poder observar si el diálogo se cerró. */
  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const montar = async (datos: DatosUsuarioDialog) => {
    await TestBed.configureTestingModule({
      imports: [UsuarioDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };

  /** Simula que se completó el formulario y se le dio a guardar. */
  const enviarFormulario = async (datos: UsuarioDto = dto) => {
    fixture.debugElement
      .query(By.directive(UsuarioFormComponent))
      .componentInstance.guardar.emit(datos);
    await fixture.whenStable();
  };

  const botonGuardar = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[type="submit"]'
    );

  beforeEach(() => {
    cierres = [];
    dialogRef.disableClose = false;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('da de alta y se cierra con el usuario que devolvió el backend', async () => {
    await montar({ usuario: null, roles: [rol] });

    await enviarFormulario();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(usuario);
    await fixture.whenStable();

    expect(cierres).toEqual([usuario]);
  });

  it('actualiza cuando recibe un usuario para editar', async () => {
    await montar({ usuario: usuario, roles: [rol] });

    // Sin contraseña: es el caso de editar sin cambiarla.
    await enviarFormulario(sinContrasena);

    const req = httpMock.expectOne(`${url}/${usuario.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).not.toHaveProperty('contrasena');
    req.flush(usuario);
    await fixture.whenStable();

    expect(cierres).toEqual([usuario]);
  });

  it('deshabilita el guardado mientras el request está en curso', async () => {
    await montar({ usuario: null, roles: [rol] });

    await enviarFormulario();

    expect(botonGuardar()?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    httpMock.expectOne(url).flush(usuario);
  });

  it('se mantiene abierto si el backend rechaza el guardado', async () => {
    await montar({ usuario: null, roles: [rol] });

    await enviarFormulario();

    httpMock.expectOne(url).flush(
      { mensaje: 'Ya existe un usuario con ese email' },
      { status: 409, statusText: 'Conflict' }
    );
    await fixture.whenStable();

    // El diálogo sigue abierto con los datos cargados y se puede reintentar.
    expect(cierres).toEqual([]);
    expect(botonGuardar()?.disabled).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
  });
});
