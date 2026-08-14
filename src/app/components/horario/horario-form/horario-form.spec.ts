import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorarioFormComponent } from './horario-form';
import { HorarioDto } from '../../../models/horario';

describe('HorarioFormComponent', () => {
  const cancha = {
    id: 3,
    nombre: 'Cancha 1',
    precioPorHora: 8500,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: 2
  };

  let fixture: ComponentFixture<HorarioFormComponent>;

  /** Completa los campos como lo haría el usuario en el navegador. */
  const completar = async (horaInicio: string, horaFin: string) => {
    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input');

    const cargar = (input: HTMLInputElement, valor: string) => {
      input.value = valor;
      input.dispatchEvent(new Event('input'));
    };

    cargar(inputs[0] as HTMLInputElement, '2026-08-20');
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
      imports: [HorarioFormComponent]
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

  it('avisa cuando la hora de fin no es posterior a la de inicio', async () => {
    const emitidos: HorarioDto[] = [];
    fixture.componentInstance.guardar.subscribe((dto) => emitidos.push(dto));

    await completar('10:00', '09:30');
    await enviar();

    expect(emitidos).toEqual([]);
    expect(errores()).toContain('Tiene que ser posterior a la hora de inicio.');
  });

  it('deja de marcar el error cuando se corrige la hora de inicio', async () => {
    await completar('10:00', '09:30');
    await enviar();

    // Bajar la hora de inicio también resuelve el problema: el error tiene que
    // recalcularse aunque el campo que cambió sea el otro.
    await completar('09:00', '09:30');

    expect(errores()).toEqual([]);
  });
});
