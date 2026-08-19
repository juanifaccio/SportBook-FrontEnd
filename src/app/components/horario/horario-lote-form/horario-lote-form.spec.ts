import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorarioLoteFormComponent } from './horario-lote-form';
import { LoteHorarioDto } from '../../../models/horario';
import { PROVEEDORES_FECHA } from '../../../core/fecha-adapter';

describe('HorarioLoteFormComponent', () => {
  const tipoCancha = { id: 2, nombre: 'Fútbol 5', descripcion: 'Césped sintético' };

  const cancha = {
    id: 3,
    nombre: 'Cancha 1',
    precioPorHora: 8500,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: tipoCancha.id,
    tipoCancha: tipoCancha
  };

  let fixture: ComponentFixture<HorarioLoteFormComponent>;

  /** Completa la fecha y el rango como lo haría el usuario en el navegador. */
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

  /** La duración se elige de una lista, así que se toca el control directamente. */
  const elegirDuracion = async (minutos: number) => {
    fixture.componentInstance['formulario'].controls.duracion.setValue(minutos);
    await fixture.whenStable();
    fixture.detectChanges();
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

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorarioLoteFormComponent],
      providers: [PROVEEDORES_FECHA]
    }).compileComponents();

    fixture = TestBed.createComponent(HorarioLoteFormComponent);
    fixture.componentRef.setInput('canchas', [cancha]);
    fixture.componentRef.setInput('canchaPorDefecto', cancha.id);
    fixture.detectChanges();
  });

  it('emite el lote cargado cuando el formulario es válido', async () => {
    const emitidos: LoteHorarioDto[] = [];
    fixture.componentInstance.generar.subscribe((dto) => emitidos.push(dto));

    await completar('08:00', '12:00');
    await enviar();

    expect(emitidos).toEqual([
      {
        fecha: '2026-08-20',
        horaInicio: '08:00',
        horaFin: '12:00',
        canchaId: cancha.id,
        duracion: 60
      }
    ]);
  });

  // Una hora es la duración más común de un turno: proponerla ahorra un campo en
  // el caso de siempre.
  it('propone turnos de una hora', () => {
    expect(fixture.componentInstance['formulario'].controls.duracion.value).toBe(60);
  });

  it('adelanta cuántos turnos van a salir del rango cargado', async () => {
    await completar('08:00', '12:00');
    fixture.detectChanges();

    expect(texto()).toContain('Se van a generar 4 turnos');
  });

  it('cuenta un solo turno en singular', async () => {
    await completar('08:00', '09:00');
    fixture.detectChanges();

    expect(texto()).toContain('Se van a generar 1 turno.');
  });

  // El rango no tiene por qué ser múltiplo de la duración: de 08:00 a 13:00 en
  // turnos de 90 minutos entran tres, y el cuarto se descarta.
  it('no cuenta el turno que no entra completo', async () => {
    await completar('08:00', '13:00');
    await elegirDuracion(90);

    expect(texto()).toContain('Se van a generar 3 turnos');
  });

  it('avisa cuando no entra ningún turno de esa duración en el rango', async () => {
    const emitidos: LoteHorarioDto[] = [];
    fixture.componentInstance.generar.subscribe((dto) => emitidos.push(dto));

    await completar('10:00', '11:00');
    await elegirDuracion(120);
    await enviar();

    expect(emitidos).toEqual([]);
    expect(errores()).toContain('No entra ningún turno de esa duración en ese horario.');
    // Y sin turnos que generar, tampoco se adelanta un número.
    expect(texto()).not.toContain('Se van a generar');
  });

  // El error está sobre la duración pero depende de las horas: bajar la
  // duración no es la única forma de arreglarlo, y ampliar el rango también
  // tiene que limpiarlo.
  it('deja de marcar el error cuando se amplía el horario', async () => {
    await completar('10:00', '11:00');
    await elegirDuracion(120);
    // Material muestra el mensaje recién cuando el campo se tocó, y el envío
    // fallido es lo que marca todos los controles.
    await enviar();
    expect(errores().length).toBeGreaterThan(0);

    await completar('10:00', '14:00');
    fixture.detectChanges();

    expect(errores()).toEqual([]);
  });

  it('avisa cuando la hora de cierre no es posterior a la de apertura', async () => {
    const emitidos: LoteHorarioDto[] = [];
    fixture.componentInstance.generar.subscribe((dto) => emitidos.push(dto));

    await completar('12:00', '08:00');
    await enviar();

    expect(emitidos).toEqual([]);
    expect(errores()).toContain('Tiene que ser posterior a la hora de apertura.');
  });

  it('no emite nada si la fecha escrita a mano no se entiende', async () => {
    const emitidos: LoteHorarioDto[] = [];
    fixture.componentInstance.generar.subscribe((dto) => emitidos.push(dto));

    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input');
    const fecha = inputs[0] as HTMLInputElement;

    fecha.value = '31 de febrero';
    fecha.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    await enviar();

    expect(emitidos).toEqual([]);
    expect(errores()).toContain('Escribí la fecha como DD/MM/AAAA, o elegila del calendario.');
  });

  // El selector muestra minutos, pero "90 minutos" se lee peor que "1 hora y 30
  // minutos", que es como lo diría alguien del complejo.
  it('lee las duraciones en horas y minutos', async () => {
    const selectores = (fixture.nativeElement as HTMLElement).querySelectorAll('mat-select');
    const duracion = selectores[selectores.length - 1];

    duracion?.querySelector('div')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();
    fixture.detectChanges();

    const opciones = [...document.querySelectorAll('mat-option')].map((o) => o.textContent?.trim());

    expect(opciones).toEqual(['30 minutos', '1 hora', '1 hora y 30 minutos', '2 horas']);
  });

  it('muestra el tipo al lado del nombre en el selector de cancha', async () => {
    // La cancha por defecto la carga un efecto, así que el select recién queda
    // con valor cuando el componente se estabiliza.
    await fixture.whenStable();
    fixture.detectChanges();

    const selector = (fixture.nativeElement as HTMLElement).querySelector('mat-select');

    expect(selector?.textContent).toContain('Cancha 1');
    expect(selector?.textContent).toContain('(Fútbol 5)');
  });
});
