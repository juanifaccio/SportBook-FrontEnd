import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DatosReprogramarDialog, ReprogramarDialogComponent } from './reprogramar-dialog';
import { environment } from '../../../../environments/environment';
import { PROVEEDORES_FECHA } from '../../../core/fecha-adapter';

describe('ReprogramarDialogComponent', () => {
  const urlReservas = `${environment.apiUrl}/reservas`;
  const urlHorarios = `${environment.apiUrl}/horarios`;

  const cancha = {
    id: 12,
    nombre: 'Cancha 3',
    precioPorHora: 4200,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: 17
  };

  const reserva = {
    id: 1,
    fecha: '2099-08-20',
    horaInicio: '11:00',
    horaFin: '13:00',
    estado: 'CONFIRMADA' as const,
    precioTotal: 8400,
    usuarioId: 6,
    canchaId: cancha.id,
    horarioId: 2,
    cancha: cancha
  };

  const turnoLibre = {
    id: 8,
    fecha: '2099-08-20',
    horaInicio: '15:00',
    horaFin: '17:00',
    disponible: true,
    canchaId: cancha.id
  };

  const datos: DatosReprogramarDialog = {
    reserva: reserva,
    canchas: [cancha]
  };

  let fixture: ComponentFixture<ReprogramarDialogComponent>;
  let httpMock: HttpTestingController;

  /** Reemplaza al `MatDialogRef` real para poder observar si el diálogo se cerró. */
  let cierres: unknown[];
  const dialogRef = {
    disableClose: false,
    close: (valor?: unknown) => cierres.push(valor)
  };

  const pedidoDeTurnos = () =>
    httpMock.expectOne((pedido) => pedido.url === urlHorarios && pedido.params.has('disponible'));

  const boton = (etiqueta: string) =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find((candidato) => candidato.textContent?.includes(etiqueta));

  /** Elige el turno libre y aprieta "Reprogramar". */
  const reprogramar = async () => {
    fixture.componentInstance['alGuardar'](turnoLibre.id);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    cierres = [];
    dialogRef.disableClose = false;

    await TestBed.configureTestingModule({
      imports: [ReprogramarDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: datos },
        PROVEEDORES_FECHA
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReprogramarDialogComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('arranca pidiendo los turnos libres de la cancha y el día que la reserva ya tiene', async () => {
    const req = pedidoDeTurnos();

    expect(req.request.params.get('canchaId')).toBe(`${cancha.id}`);
    expect(req.request.params.get('fecha')).toBe(reserva.fecha);
    expect(req.request.params.get('disponible')).toBe('true');
    req.flush([turnoLibre]);
    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('15:00 a 17:00');
  });

  it('vuelve a pedir los turnos al cambiar de día', async () => {
    pedidoDeTurnos().flush([turnoLibre]);
    await fixture.whenStable();

    fixture.componentInstance['buscarTurnos']({ canchaId: cancha.id, fecha: '2099-08-21' });

    const req = pedidoDeTurnos();
    expect(req.request.params.get('fecha')).toBe('2099-08-21');
    req.flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No quedan turnos libres');
  });

  it('envía solo el turno nuevo y se cierra con la reserva reprogramada', async () => {
    pedidoDeTurnos().flush([turnoLibre]);
    await fixture.whenStable();

    await reprogramar();

    const req = httpMock.expectOne(`${urlReservas}/${reserva.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ horarioId: turnoLibre.id });

    const reprogramada = { ...reserva, horarioId: turnoLibre.id, horaInicio: '15:00' };
    req.flush(reprogramada);
    await fixture.whenStable();

    expect(cierres).toEqual([reprogramada]);
  });

  it('se mantiene abierto si alguien se adelantó y tomó el turno', async () => {
    pedidoDeTurnos().flush([turnoLibre]);
    await fixture.whenStable();

    await reprogramar();

    httpMock
      .expectOne(`${urlReservas}/${reserva.id}`)
      .flush({ mensaje: 'El turno ya fue reservado' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    fixture.detectChanges();

    // Sigue abierto para que el usuario elija otro turno o reintente.
    expect(cierres).toEqual([]);
    expect(dialogRef.disableClose).toBe(false);
  });

  it('se cierra sin reprogramar al cancelar', async () => {
    pedidoDeTurnos().flush([turnoLibre]);
    await fixture.whenStable();

    boton('Cancelar')?.click();
    await fixture.whenStable();

    expect(cierres).toEqual([undefined]);
  });
});
