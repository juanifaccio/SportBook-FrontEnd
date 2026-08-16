import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { HorarioComponent } from './horario';
import { environment } from '../../../environments/environment';

describe('HorarioComponent', () => {
  const urlCanchas = `${environment.apiUrl}/canchas`;
  const urlHorarios = `${environment.apiUrl}/horarios`;

  const tipoCancha = { id: 2, nombre: 'Fútbol 5', descripcion: 'Césped sintético' };

  const cancha = {
    id: 3,
    nombre: 'Cancha 1',
    precioPorHora: 8500,
    estado: 'DISPONIBLE',
    tipoCanchaId: tipoCancha.id,
    tipoCancha: tipoCancha
  };

  const horario = {
    id: 1,
    fecha: '2026-08-20',
    horaInicio: '10:00',
    horaFin: '11:00',
    disponible: true,
    canchaId: cancha.id,
    cancha: cancha
  };

  let fixture: ComponentFixture<HorarioComponent>;
  let httpMock: HttpTestingController;

  /**
   * La pantalla pide primero las canchas y recién después los turnos de la que
   * queda elegida, así que los dos requests son secuenciales.
   */
  const responder = (canchas: unknown[], horarios: unknown[]) => {
    httpMock.expectOne(urlCanchas).flush(canchas);

    if (canchas.length > 0) {
      httpMock.expectOne(`${urlHorarios}?canchaId=${cancha.id}`).flush(horarios);
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorarioComponent, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HorarioComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    fixture.detectChanges();
    responder([cancha], []);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra los turnos de la cancha elegida', async () => {
    fixture.detectChanges();

    responder([cancha], [horario]);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('20/08/2026');
    expect(texto).toContain('10:00');
    expect(texto).toContain('11:00');
  });

  it('muestra el tipo al lado del nombre en el selector de cancha', async () => {
    fixture.detectChanges();

    responder([cancha], [horario]);
    await fixture.whenStable();

    // El nombre solo no distingue dos canchas: sin el tipo es fácil terminar
    // cargándole el turno a la equivocada.
    const selector = (fixture.nativeElement as HTMLElement).querySelector('mat-select');
    expect(selector?.textContent).toContain('Cancha 1');
    expect(selector?.textContent).toContain('(Fútbol 5)');
  });

  it('muestra el estado vacío cuando la cancha no tiene turnos', async () => {
    fixture.detectChanges();

    responder([cancha], []);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Esta cancha todavía no tiene horarios');
  });

  it('avisa que primero hay que crear una cancha', async () => {
    fixture.detectChanges();

    responder([], []);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Todavía no hay canchas');
  });

  it('ofrece reintentar cuando la carga falla', async () => {
    fixture.detectChanges();

    httpMock.expectOne(urlCanchas).flush(
      { mensaje: 'Error interno' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reintentar');
  });
});
