import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuarioFormComponent } from './usuario-form';
import { UsuarioDto } from '../../../models/usuario';

describe('UsuarioFormComponent', () => {
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

  let fixture: ComponentFixture<UsuarioFormComponent>;
  let emitidos: UsuarioDto[];

  /** Escribe en un input identificándolo por su `formControlName`. */
  const cargar = async (control: string, valor: string) => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      `input[formControlName="${control}"]`
    );

    input!.value = valor;
    input!.dispatchEvent(new Event('input'));

    await fixture.whenStable();
  };

  const enviar = async () => {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLFormElement>('form')
      ?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  const errores = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('mat-error')].map((e) =>
      e.textContent?.trim()
    );

  const montar = async (usuarioAEditar: typeof usuario | null) => {
    await TestBed.configureTestingModule({
      imports: [UsuarioFormComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioFormComponent);
    fixture.componentRef.setInput('usuario', usuarioAEditar);
    fixture.componentRef.setInput('roles', [rol]);
    fixture.detectChanges();
    await fixture.whenStable();

    emitidos = [];
    fixture.componentInstance.guardar.subscribe((dto) => emitidos.push(dto));
  };

  it('emite el alta con la contraseña cargada', async () => {
    await montar(null);

    await cargar('nombre', 'Juan Pérez');
    await cargar('email', 'juan@ejemplo.com');
    await cargar('telefono', '341 555-1234');
    await cargar('contrasena', 'secreta123');
    fixture.componentInstance['formulario'].controls.rolId.setValue(rol.id);
    await enviar();

    expect(emitidos).toEqual([
      {
        nombre: 'Juan Pérez',
        email: 'juan@ejemplo.com',
        telefono: '341 555-1234',
        rolId: rol.id,
        activo: true,
        contrasena: 'secreta123'
      }
    ]);
  });

  it('exige la contraseña al dar de alta', async () => {
    await montar(null);

    await cargar('nombre', 'Juan Pérez');
    await cargar('email', 'juan@ejemplo.com');
    await cargar('telefono', '341 555-1234');
    fixture.componentInstance['formulario'].controls.rolId.setValue(rol.id);
    await enviar();

    expect(emitidos).toEqual([]);
    expect(errores()).toContain('La contraseña es obligatoria.');
  });

  it('omite la contraseña al editar si se deja vacía', async () => {
    await montar(usuario);

    await enviar();

    // Sin el campo, el backend conserva el hash que ya tenía guardado.
    expect(emitidos).toEqual([
      {
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        rolId: usuario.rolId,
        activo: true
      }
    ]);
  });

  it('la manda al editar si se escribió una nueva', async () => {
    await montar(usuario);

    await cargar('contrasena', 'otraclave456');
    await enviar();

    expect(emitidos[0].contrasena).toBe('otraclave456');
  });

  it('rechaza una contraseña más corta que el mínimo', async () => {
    await montar(usuario);

    await cargar('contrasena', 'corta');
    await enviar();

    expect(emitidos).toEqual([]);
    expect(errores()).toContain('La contraseña tiene que tener al menos 8 caracteres.');
  });
});
