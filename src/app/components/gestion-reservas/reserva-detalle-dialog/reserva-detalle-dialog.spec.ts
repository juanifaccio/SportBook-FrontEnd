import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ReservaDetalleDialogComponent } from './reserva-detalle-dialog';

describe('ReservaDetalleDialogComponent', () => {
  const cancha = {
    id: 12,
    nombre: 'Cancha 3',
    precioPorHora: 4200,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: 17,
    tipoCancha: { id: 17, nombre: 'Pádel', descripcion: 'Cancha de pádel' }
  };

  const usuario = {
    id: 6,
    nombre: 'Lucía Gómez',
    email: 'lucia.gomez@ejemplo.com',
    telefono: '341 555-9876',
    activo: true,
    rolId: 2
  };

  const reserva = {
    id: 1,
    fecha: '2026-08-20',
    horaInicio: '11:00',
    horaFin: '13:00',
    estado: 'CONFIRMADA' as const,
    precioTotal: 8400,
    usuarioId: usuario.id,
    canchaId: cancha.id,
    horarioId: 2,
    usuario: usuario,
    cancha: cancha
  };

  let fixture: ComponentFixture<ReservaDetalleDialogComponent>;

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservaDetalleDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: reserva }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservaDetalleDialogComponent);
    fixture.detectChanges();
  });

  it('muestra los datos que no entran en el listado', () => {
    // El listado muestra cancha, día, horario, usuario, estado y total; el
    // detalle suma el tipo de cancha, el contacto y el precio por hora.
    expect(texto()).toContain('Pádel');
    expect(texto()).toContain(usuario.email);
    expect(texto()).toContain(usuario.telefono);
  });

  it('muestra el día como DD/MM/AAAA y el estado en castellano', () => {
    expect(texto()).toContain('20/08/2026');
    expect(texto()).toContain('11:00 a 13:00');
    expect(texto()).toContain('Confirmada');
  });
});
