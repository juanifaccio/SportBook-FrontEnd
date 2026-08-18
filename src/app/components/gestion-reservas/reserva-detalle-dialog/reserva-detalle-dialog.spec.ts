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

  // La mayoría de las reservas son un partido y nada más: sin evento no tiene
  // que aparecer una fila vacía.
  it('no muestra la fila de evento si la reserva no tiene uno', () => {
    expect(texto()).not.toContain('Evento');
  });

  describe('los pagos de la reserva', () => {
    const montar = async (pagos: unknown[]) => {
      TestBed.resetTestingModule();

      await TestBed.configureTestingModule({
        imports: [ReservaDetalleDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: { close: () => {} } },
          { provide: MAT_DIALOG_DATA, useValue: { ...reserva, pagos: pagos } }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(ReservaDetalleDialogComponent);
      fixture.detectChanges();
    };

    const pago = (monto: number, estado = 'REGISTRADO') => ({
      id: 1,
      monto: monto,
      fecha: '2026-08-18',
      metodo: 'EFECTIVO',
      estado: estado,
      reservaId: reserva.id
    });

    it('sin pagos muestra el total entero como saldo', async () => {
      await montar([]);

      expect(texto()).toContain('Falta pagar');
    });

    it('lista los pagos con su método', async () => {
      await montar([pago(3000)]);

      expect(texto()).toContain('Efectivo');
      expect(texto()).toContain('18/08/2026');
    });

    // El total es 8400: con 3000 pagos, faltan 5400.
    it('descuenta lo pagado del saldo', async () => {
      await montar([pago(3000)]);

      expect(fixture.componentInstance['saldo']()).toBe(5400);
    });

    // Un pago anulado se sigue mostrando —es historial— pero deja de contar.
    it('no descuenta los pagos anulados', async () => {
      await montar([pago(3000), { ...pago(5400), id: 2, estado: 'ANULADO' }]);

      expect(fixture.componentInstance['saldo']()).toBe(5400);
    });

    it('con la reserva paga no muestra el saldo', async () => {
      await montar([pago(8400)]);

      expect(fixture.componentInstance['saldo']()).toBe(0);
      expect(texto()).not.toContain('Falta pagar');
    });
  });

  describe('cuando la reserva tiene un evento', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();

      await TestBed.configureTestingModule({
        imports: [ReservaDetalleDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: { close: () => {} } },
          {
            provide: MAT_DIALOG_DATA,
            useValue: {
              ...reserva,
              evento: {
                id: 4,
                descripcion: 'Cumpleaños de 15',
                cantidadPersonas: 40,
                tipoEventoId: 3,
                reservaId: reserva.id,
                tipoEvento: { id: 3, nombre: 'Cumpleaños' }
              }
            }
          }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(ReservaDetalleDialogComponent);
      fixture.detectChanges();
    });

    // Es lo que pide la propuesta del detalle: los datos completos de la reserva
    // y de su evento.
    it('lo muestra con su tipo, descripción y cantidad de personas', () => {
      expect(texto()).toContain('Cumpleaños de 15');
      expect(texto()).toContain('40 personas');
    });
  });
});
