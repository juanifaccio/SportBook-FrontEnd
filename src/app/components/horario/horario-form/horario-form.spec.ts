import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorarioFormComponent } from './horario-form';
import { HorarioDto } from '../../../models/horario';
import { PROVEEDORES_FECHA } from '../../../core/fecha-adapter';

describe('HorarioFormComponent', () => {
  const tipoCancha = { id: 2, nombre: 'Fútbol 5', descripcion: 'Césped sintético' };

  const cancha = {
    id: 3,
    nombre: 'Cancha 1',
    precioPorHora: 8500,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: tipoCancha.id,
    tipoCancha: tipoCancha
  };

  let fixture: ComponentFixture<HorarioFormComponent>;

  const completar = async (horaInicio: string, horaFin: string) => {
    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input');

    const cargar = (input: HTMLInputElement, valor: string) => {
      input.value = valor;
      input.dispatchEvent(new Event('input'));
    };

    cargar(inputs[0] as HTMLInputElement, '20/08/2026');
    cargar(inputs[1] as HTMLInputElement, horaInicio);
    cargar(inputs[2] as HTMLInputElement, horaFin);

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorarioFormComponent],
      providers: [PROVEEDORES_FECHA]
    }).compileComponents();

    fixture = TestBed.createComponent(HorarioFormComponent);
    fixture.componentRef.setInput('canchas', [cancha]);
    fixture.componentRef.setInput('canchaPorDefecto', cancha.id);
    fixture.detectChanges();
  });

  it('emite el turno cargado cuando el formulario es válido', async () => {
    const emitidos: HorarioDto[] = [];
    fixture.componentInstance.guardar.subscribe((dto) => emitidos.push(dto));

    await completar('10:00', '11:00');
    await enviar();

    expect(emitidos).toEqual([
      {
        fecha: '2026-08-20',
        horaInicio: '10:00',
        horaFin: '11:00',
        canchaId: cancha.id,
        disponible: true
      }
    ]);
  });

  it('muestra el tipo al lado del nombre en el selector de cancha', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const selector = (fixture.nativeElement as HTMLElement).querySelector('mat-select');

    expect(selector?.textContent).toContain('Cancha 1');
    expect(selector?.textContent).toContain('(Fútbol 5)');
  });

  it('avisa cuando la hora de fin no es posterior a la de inicio', async () => {
    const emitidos: HorarioDto[] = [];
    fixture.componentInstance.guardar.subscribe((dto) => emitidos.push(dto));

    await completar('10:00', '09:30');
    await enviar();

    expect(emitidos).toEqual([]);
    expect(errores()).toContain('Tiene que ser posterior a la hora de inicio.');
  });

  it('no emite nada si la fecha escrita a mano no se entiende', async () => {
    const emitidos: HorarioDto[] = [];
    fixture.componentInstance.guardar.subscribe((dto) => emitidos.push(dto));

    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input');
    const fecha = inputs[0] as HTMLInputElement;

    fecha.value = '31 de febrero';
    fecha.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    await enviar();

    expect(emitidos).toEqual([]);
    expect(errores()).toContain('Escribí la fecha como DD/MM/AAAA, o elegila del calendario.');
  });

  it('no emite nada si la hora escrita a mano no se entiende', async () => {
    const emitidos: HorarioDto[] = [];
    fixture.componentInstance.guardar.subscribe((dto) => emitidos.push(dto));

    await completar('mediodía', '11:00');
    await enviar();

    expect(emitidos).toEqual([]);
    expect(errores()).toContain('Escribí la hora como HH:mm, o elegila de la lista.');
    expect(errores()).not.toContain('La hora de inicio es obligatoria.');
  });

  it('acepta la hora escrita con un solo dígito', async () => {
    const emitidos: HorarioDto[] = [];
    fixture.componentInstance.guardar.subscribe((dto) => emitidos.push(dto));

    await completar('9:30', '11:00');
    await enviar();

    expect(emitidos[0]?.horaInicio).toBe('09:30');
  });

  it('deja de marcar el error cuando se corrige la hora de inicio', async () => {
    await completar('10:00', '09:30');
    await enviar();

    await completar('09:00', '09:30');

    expect(errores()).toEqual([]);
  });
});
