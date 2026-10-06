import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { ReservaComponent } from './reserva';
import { environment } from '../../../environments/environment';
import { PROVEEDORES_FECHA } from '../../core/fecha-adapter';
import {
  USUARIO_ADMIN,
  USUARIO_CLIENTE,
  cerrarSesionDePrueba,
  iniciarSesionDePrueba
} from '../../core/testing/sesion';

describe('ReservaComponent', () => {
  const urlCanchas = `${environment.apiUrl}/canchas`;
  const urlUsuarios = `${environment.apiUrl}/usuarios`;
  const urlHorarios = `${environment.apiUrl}/horarios`;
  const urlTiposEvento = `${environment.apiUrl}/tipos-evento`;
  const urlEquipamientos = `${environment.apiUrl}/equipamientos`;

  const tipoCancha = { id: 17, nombre: 'Pádel', descripcion: 'Cancha de pádel' };

  const tipoEvento = { id: 3, nombre: 'Cumpleaños' };

  const cancha = {
    id: 12,
    nombre: 'Cancha 3',
    precioPorHora: 4200,
    estado: 'DISPONIBLE' as const,
    tipoCanchaId: tipoCancha.id,
    tipoCancha: tipoCancha
  };

  const canchaEnMantenimiento = {
    id: 13,
    nombre: 'Cancha 2',
    precioPorHora: 4500,
    estado: 'MANTENIMIENTO' as const,
    tipoCanchaId: 17
  };

  const usuario = {
    id: 6,
    nombre: 'Lucía Gómez',
    email: 'lucia.gomez@ejemplo.com',
    telefono: '341 555-9876',
    activo: true,
    rolId: 2
  };

  const usuarioDeBaja = { ...usuario, id: 7, nombre: 'Martín Ruiz', activo: false };

  const turno = {
    id: 2,
    fecha: '2026-08-20',
    horaInicio: '11:00',
    horaFin: '13:00',
    disponible: true,
    canchaId: cancha.id
  };

  let fixture: ComponentFixture<ReservaComponent>;
  let httpMock: HttpTestingController;

  /** El pedido de turnos lleva la fecha de hoy, que cambia según el día. */
  const pedidoDeTurnos = () =>
    httpMock.expectOne((pedido) => pedido.url === urlHorarios && pedido.params.has('disponible'));

  /**
   * La pantalla pide canchas, usuarios y tipos de evento a la vez, y recién con
   * una cancha elegida pide los turnos del día. Si ninguna cancha está
   * disponible no queda ninguna elegida, así que ese último pedido no llega a
   * salir.
   */
  const responder = async (
    canchas: { estado: string }[],
    usuarios: unknown[],
    turnos: unknown[],
    tiposEvento: unknown[] = [tipoEvento]
  ) => {
    httpMock.expectOne(urlCanchas).flush(canchas);
    httpMock.expectOne(urlUsuarios).flush(usuarios);
    httpMock.expectOne(urlTiposEvento).flush(tiposEvento);
    await fixture.whenStable();

    if (canchas.some((cancha) => cancha.estado === 'DISPONIBLE')) {
      pedidoDeTurnos().flush(turnos);
      await fixture.whenStable();
    }

    fixture.detectChanges();
  };

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const botonReservar = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find((boton) => boton.textContent?.includes('Reservar'));

  /**
   * La pantalla se comporta distinto según el rol, así que la sesión se arma
   * antes de configurar el `TestBed`: `AuthService` la lee al construirse.
   * Por defecto es un administrador, que es quien elige a nombre de quién va la
   * reserva.
   */
  const preparar = async (usuario = USUARIO_ADMIN) => {
    iniciarSesionDePrueba(usuario);

    await TestBed.configureTestingModule({
      imports: [ReservaComponent, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), PROVEEDORES_FECHA]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservaComponent);
    httpMock = TestBed.inject(HttpTestingController);
  };

  beforeEach(async () => {
    await preparar();
  });

  afterEach(() => {
    httpMock.verify();
    cerrarSesionDePrueba();
  });

  it('se crea correctamente', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], [turno]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra los turnos libres de la cancha elegida', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], [turno]);

    expect(texto()).toContain('11:00 a 13:00');
  });

  it('no ofrece canchas en mantenimiento ni usuarios dados de baja', async () => {
    fixture.detectChanges();
    await responder([cancha, canchaEnMantenimiento], [usuario, usuarioDeBaja], [turno]);

    // El backend rechaza las dos cosas, así que ni siquiera aparecen como opción.
    expect(texto()).not.toContain(canchaEnMantenimiento.nombre);
    expect(texto()).not.toContain(usuarioDeBaja.nombre);
  });

  it('avisa cuando no hay ninguna cancha disponible', async () => {
    fixture.detectChanges();
    await responder([canchaEnMantenimiento], [usuario], []);

    expect(texto()).toContain('No hay canchas disponibles');
  });

  it('avisa cuando no hay usuarios activos', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuarioDeBaja], []);

    expect(texto()).toContain('No hay usuarios activos');
  });

  it('avisa cuando el día elegido no tiene turnos libres', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], []);

    expect(texto()).toContain('No quedan turnos libres');
  });

  it('vuelve a pedir los turnos al cambiar de día y olvida el que estaba elegido', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], [turno]);

    fixture.componentInstance['alElegirTurno'](turno.id);
    // El calendario entrega un `Date` local y el backend espera "AAAA-MM-DD".
    fixture.componentInstance['alCambiarFecha'](new Date(2026, 7, 21));

    const req = pedidoDeTurnos();
    expect(req.request.params.get('fecha')).toBe('2026-08-21');
    req.flush([]);
    await fixture.whenStable();

    // El turno de ayer ya no está en la lista: dejarlo elegido reservaría uno
    // que el usuario no está viendo.
    expect(fixture.componentInstance['turnoSeleccionado']()).toBeNull();
  });

  it('calcula el total con la duración del turno y habilita el botón', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], [turno]);

    expect(botonReservar()?.disabled).toBe(true);

    fixture.componentInstance['alElegirTurno'](turno.id);
    fixture.componentInstance['alElegirUsuario'](usuario.id);
    fixture.detectChanges();

    // Dos horas a 4200 por hora.
    expect(fixture.componentInstance['precioTotal']()).toBe(8400);
    expect(botonReservar()?.disabled).toBe(false);
  });

  it('muestra el tipo al lado del nombre de la cancha en el resumen', async () => {
    fixture.detectChanges();
    await responder([cancha], [usuario], [turno]);

    fixture.componentInstance['alElegirTurno'](turno.id);
    fixture.detectChanges();

    // El nombre solo no distingue dos canchas: el tipo es lo que evita confirmar
    // la reserva en la que no era.
    expect(texto()).toContain(cancha.nombre);
    expect(texto()).toContain('(Pádel)');
  });

  it('muestra el error con reintento si falla la carga inicial', async () => {
    fixture.detectChanges();

    // El de canchas se responde último: los tres pedidos salen juntos y, en
    // cuanto uno falla, los otros quedan cancelados y ya no se les puede
    // responder.
    httpMock.expectOne(urlUsuarios).flush([usuario]);
    httpMock.expectOne(urlTiposEvento).flush([tipoEvento]);
    httpMock.expectOne(urlCanchas).flush(
      { mensaje: 'Error al listar las canchas' },
      { status: 500, statusText: 'Server Error' }
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('No se pudo cargar la pantalla');
  });

  it('al cliente no le pide el listado de usuarios ni le ofrece elegir a nombre de quién', async () => {
    TestBed.resetTestingModule();
    await preparar(USUARIO_CLIENTE);

    fixture.detectChanges();

    // El listado de usuarios es de administración: al cliente el backend se lo
    // rechaza con un 403, así que la pantalla ni siquiera lo pide. Que
    // `httpMock.verify()` no se queje al terminar prueba que no salió.
    httpMock.expectOne(urlCanchas).flush([cancha]);
    httpMock.expectOne(urlTiposEvento).flush([tipoEvento]);
    await fixture.whenStable();
    pedidoDeTurnos().flush([turno]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).not.toContain('A nombre de');

    // Su propia reserva va a su nombre sin elegir nada: con el turno elegido
    // alcanza para poder reservar.
    fixture.componentInstance['alElegirTurno'](turno.id);
    fixture.detectChanges();

    expect(fixture.componentInstance['usuarioSeleccionado']()).toBe(USUARIO_CLIENTE.id);
    expect(botonReservar()?.disabled).toBe(false);
  });

  describe('el evento de la reserva', () => {
    /** Deja la pantalla con un turno y un usuario ya elegidos. */
    const conTurnoElegido = async () => {
      fixture.detectChanges();
      await responder([cancha], [usuario], [turno]);

      fixture.componentInstance['alElegirTurno'](turno.id);
      fixture.componentInstance['alElegirUsuario'](usuario.id);
      fixture.detectChanges();
    };

    const completarEvento = () => {
      fixture.componentInstance['eventoFormulario'].setValue({
        tipoEventoId: tipoEvento.id,
        descripcion: 'Cumpleaños de 15',
        cantidadPersonas: 40
      });
      fixture.detectChanges();
    };

    it('ofrece declararlo cuando hay tipos cargados', async () => {
      await conTurnoElegido();

      expect(texto()).toContain('Es para un evento');
    });

    // Sin tipos no hay nada que elegir, así que la sección no aparece: una
    // reserva sin evento es lo normal, no un error.
    it('no ofrece nada si no hay tipos de evento', async () => {
      fixture.detectChanges();
      await responder([cancha], [usuario], [turno], []);

      expect(texto()).not.toContain('Es para un evento');
    });

    // Marcado pero incompleto se reservaría sin el evento y sin avisar: o se
    // completa, o se destilda.
    it('bloquea el botón mientras el evento marcado está incompleto', async () => {
      await conTurnoElegido();
      expect(botonReservar()?.disabled).toBe(false);

      fixture.componentInstance['alCambiarConEvento'](true);
      fixture.detectChanges();

      expect(botonReservar()?.disabled).toBe(true);

      completarEvento();

      expect(botonReservar()?.disabled).toBe(false);
    });

    it('rechaza una cantidad de personas con decimales', async () => {
      await conTurnoElegido();
      fixture.componentInstance['alCambiarConEvento'](true);
      completarEvento();

      fixture.componentInstance['eventoFormulario'].controls.cantidadPersonas.setValue(12.5);
      fixture.detectChanges();

      expect(botonReservar()?.disabled).toBe(true);
    });

    it('olvida lo cargado al destildarlo', async () => {
      await conTurnoElegido();
      fixture.componentInstance['alCambiarConEvento'](true);
      completarEvento();

      fixture.componentInstance['alCambiarConEvento'](false);
      fixture.detectChanges();

      const controles = fixture.componentInstance['eventoFormulario'].controls;

      // La descripción es `nonNullable`, así que vuelve a su valor inicial y no
      // a null como los dos numéricos.
      expect(controles.descripcion.value).toBe('');
      expect(controles.tipoEventoId.value).toBeNull();
      expect(controles.cantidadPersonas.value).toBeNull();
      // Sin evento marcado, el botón vuelve a depender solo del turno.
      expect(botonReservar()?.disabled).toBe(false);
    });
  });

  describe('el equipamiento de la reserva', () => {
    const pelota = { id: 4, nombre: 'Pelota de pádel', descripcion: 'Tubo de tres', precio: 1500, stock: 10 };
    const paleta = { id: 5, nombre: 'Paleta', descripcion: 'De fibra', precio: 2000, stock: 2 };

    const otroTurno = { ...turno, id: 3, horaInicio: '15:00', horaFin: '16:00' };

    /** El pedido del equipamiento lleva el turno elegido. */
    const pedidoDeEquipamiento = (horarioId: number) =>
      httpMock.expectOne(
        (pedido) => pedido.url === urlEquipamientos && pedido.params.get('horarioId') === String(horarioId)
      );

    /** Deja la pantalla con un turno elegido y la sección de equipamiento abierta. */
    const conEquipamientoAbierto = async (disponibles = [
      { ...pelota, disponibles: 8 },
      { ...paleta, disponibles: 0 }
    ]) => {
      fixture.detectChanges();
      await responder([cancha], [usuario], [turno, otroTurno]);

      fixture.componentInstance['alElegirTurno'](turno.id);
      fixture.componentInstance['alElegirUsuario'](usuario.id);
      fixture.componentInstance['alCambiarConEquipamiento'](true);

      pedidoDeEquipamiento(turno.id).flush(disponibles);
      await fixture.whenStable();
      fixture.detectChanges();
    };

    const sumar = (equipamiento: { id: number }, veces = 1) => {
      const componente = fixture.componentInstance;
      const articulo = componente['equipamientos']().find((candidato) => candidato.id === equipamiento.id)!;

      for (let i = 0; i < veces; i++) {
        componente['cambiarCantidad'](articulo, 1);
      }

      fixture.detectChanges();
    };

    // Plegado, no pide nada: la mayoría de los que reservan traen lo suyo.
    it('no pide el equipamiento hasta que se marca la sección', async () => {
      fixture.detectChanges();
      await responder([cancha], [usuario], [turno]);

      fixture.componentInstance['alElegirTurno'](turno.id);
      fixture.detectChanges();

      httpMock.expectNone((pedido) => pedido.url === urlEquipamientos);
      expect(texto()).toContain('Alquilar equipamiento');
    });

    it('muestra lo que queda libre en el turno y marca lo que no tiene unidades', async () => {
      await conEquipamientoAbierto();

      expect(texto()).toContain('Pelota de pádel');
      expect(texto()).toContain('quedan 8');
      expect(texto()).toContain('sin unidades para este turno');
    });

    it('suma el equipamiento al total', async () => {
      await conEquipamientoAbierto();

      sumar(pelota, 2);

      // Dos horas a 4200, más dos tubos a 1500.
      expect(fixture.componentInstance['precioTotal']()).toBe(11400);
      expect(texto()).toContain('2 × Pelota de pádel');
    });

    it('no deja pasar de las unidades libres', async () => {
      await conEquipamientoAbierto([{ ...pelota, disponibles: 2 }]);

      sumar(pelota, 5);

      expect(fixture.componentInstance['cantidadDe']({ ...pelota, disponibles: 2 })).toBe(2);
    });

    it('al cambiar de turno vuelve a preguntar y recorta lo que ya no alcanza', async () => {
      await conEquipamientoAbierto();
      sumar(pelota, 5);

      fixture.componentInstance['alElegirTurno'](otroTurno.id);
      pedidoDeEquipamiento(otroTurno.id).flush([{ ...pelota, disponibles: 3 }]);
      await fixture.whenStable();

      expect(fixture.componentInstance['cantidadDe'](pelota)).toBe(3);
    });

    it('bloquea el botón mientras llegan las unidades libres', async () => {
      fixture.detectChanges();
      await responder([cancha], [usuario], [turno]);

      fixture.componentInstance['alElegirTurno'](turno.id);
      fixture.componentInstance['alElegirUsuario'](usuario.id);
      fixture.componentInstance['alCambiarConEquipamiento'](true);
      fixture.detectChanges();

      expect(botonReservar()?.disabled).toBe(true);

      pedidoDeEquipamiento(turno.id).flush([{ ...pelota, disponibles: 8 }]);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(botonReservar()?.disabled).toBe(false);
    });

    it('olvida lo elegido al destildarlo', async () => {
      await conEquipamientoAbierto();
      sumar(pelota, 2);

      fixture.componentInstance['alCambiarConEquipamiento'](false);
      fixture.detectChanges();

      expect(fixture.componentInstance['equipamientoElegido']()).toEqual([]);
      expect(fixture.componentInstance['precioTotal']()).toBe(8400);
    });

    it('muestra el error con reintento si no se pudo cargar', async () => {
      fixture.detectChanges();
      await responder([cancha], [usuario], [turno]);

      fixture.componentInstance['alElegirTurno'](turno.id);
      fixture.componentInstance['alCambiarConEquipamiento'](true);
      pedidoDeEquipamiento(turno.id).flush(
        { mensaje: 'Error al listar el equipamiento' },
        { status: 500, statusText: 'Server Error' }
      );
      await fixture.whenStable();
      fixture.detectChanges();

      expect(texto()).toContain('No se pudo cargar el equipamiento');
    });
  });
});
