import { Page, Route } from '@playwright/test';
import { Cancha } from '../../src/app/models/cancha';
import { Evento } from '../../src/app/models/evento';
import { Horario } from '../../src/app/models/horario';
import { Reserva } from '../../src/app/models/reserva';
import { Usuario } from '../../src/app/models/usuario';
import { EstadoApi, UsuarioSembrado, datosIniciales } from './datos';

/**
 * El backend de SportBook, simulado dentro del navegador.
 *
 * Intercepta todo lo que la aplicación le pide a `/api` y lo responde desde un
 * estado en memoria, reproduciendo el contrato real: los mismos códigos HTTP,
 * los mismos `{ mensaje }` en español y las mismas reglas de negocio que la API
 * de verdad —quién puede llamar a qué, el turno que se ocupa al reservar y se
 * libera al cancelar, la reserva que ya empezó y no se puede tocar—.
 *
 * No es un stub que devuelve listas fijas: guarda lo que se crea, se edita y se
 * borra, así que un test puede reservar un turno y comprobar después que dejó de
 * ofrecerse. Eso es lo que permite que los e2e recorran flujos completos sin
 * levantar el backend ni una base MySQL.
 *
 * `fallar()` está para lo que de otro modo no se podría provocar: los estados de
 * error y de reintento de cada pantalla.
 */

/** Fallo forzado por un test para la próxima llamada que coincida. */
interface Falla {
  metodo: string;
  ruta: string;
  estado: number;
  mensaje: string;
  veces: number;
}

/** Lo que la API contesta: el código HTTP y el JSON del cuerpo. */
interface Respuesta {
  estado: number;
  cuerpo: unknown;
}

/** Una llamada ya desarmada, con la sesión resuelta. */
interface Pedido {
  metodo: string;
  /** Camino sin el prefijo `/api`, por ejemplo `/tipos-cancha/3`. */
  ruta: string;
  parametros: URLSearchParams;
  cuerpo: Record<string, unknown>;
  sesion: UsuarioSembrado | null;
}

/**
 * Todo lo que cuelgue de `/api`, sin importar el origen.
 *
 * Va como expresión regular y no como el glob `**\/api/**`: desde que Playwright
 * empareja los globs por segmento de ruta, ese patrón no llega a coincidir con
 * una URL completa —protocolo y host incluidos— y las llamadas se le escapan al
 * servidor de desarrollo, que responde un 404 en HTML.
 */
const RUTA_API = /\/api\//;

const ok = (cuerpo: unknown, estado = 200): Respuesta => ({ estado, cuerpo });

const falla = (estado: number, mensaje: string): Respuesta => ({ estado, cuerpo: { mensaje } });

/** El id que va al final de la ruta, o `null` si no hay ninguno. */
const idDe = (ruta: string, recurso: string): number | null => {
  const partes = new RegExp(`^${recurso}/(\\d+)$`).exec(ruta);

  return partes ? Number(partes[1]) : null;
};

/** La contraseña no sale nunca en una respuesta, ni siquiera hasheada. */
const sinContrasena = (usuario: UsuarioSembrado): Usuario => {
  const { contrasena, ...resto } = usuario;

  return resto;
};

/** Minutos desde la medianoche, para poder restar dos horas `"HH:mm"`. */
const minutosDe = (hora: string): number => {
  const [horas, minutos] = hora.split(':').map(Number);

  return horas * 60 + minutos;
};

/** Si un turno ya arrancó, en hora local, que es la del complejo. */
const yaEmpezo = (fecha: string, horaInicio: string): boolean => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [hora, minuto] = horaInicio.split(':').map(Number);

  return new Date(anio, mes - 1, dia, hora, minuto).getTime() <= Date.now();
};

const proximoId = (coleccion: { id: number }[]): number =>
  coleccion.reduce((mayor, item) => Math.max(mayor, item.id), 0) + 1;

/** El cuerpo del request como objeto. Un DELETE no manda ninguno. */
const cuerpoDe = (texto: string | null): Record<string, unknown> => {
  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export class ApiFalsa {

  /** El estado del servidor. Los tests lo pueden leer para comprobar efectos. */
  readonly estado: EstadoApi;

  private readonly fallas: Falla[] = [];

  constructor(estado: EstadoApi = datosIniciales()) {
    this.estado = estado;
  }

  /**
   * Hace fallar las próximas llamadas que coincidan con ese método y esa ruta.
   *
   * Con `estado: 0` el request ni siquiera llega: es el backend caído, que es
   * como se prueban los mensajes de "no se pudo conectar".
   */
  fallar(
    metodo: string,
    ruta: string,
    estado: number,
    opciones: { mensaje?: string; veces?: number } = {}
  ): void {
    this.fallas.push({
      metodo: metodo,
      ruta: ruta,
      estado: estado,
      mensaje: opciones.mensaje ?? 'Error simulado por el test',
      veces: opciones.veces ?? 1
    });
  }

  /** Engancha la API a la página. Hay que llamarla antes de navegar. */
  async instalar(pagina: Page): Promise<void> {
    await pagina.route(RUTA_API, (ruta) => this.atender(ruta));
  }

  private async atender(ruta: Route): Promise<void> {
    const pedido = ruta.request();
    const url = new URL(pedido.url());
    const camino = url.pathname.replace(/^\/api/, '');
    const metodo = pedido.method();

    const forzada = this.tomarFalla(metodo, camino);

    if (forzada) {
      if (forzada.estado === 0) {
        await ruta.abort('failed');
        return;
      }

      await ruta.fulfill({
        status: forzada.estado,
        contentType: 'application/json',
        body: JSON.stringify({ mensaje: forzada.mensaje })
      });

      return;
    }

    const respuesta = this.responder({
      metodo: metodo,
      ruta: camino,
      parametros: url.searchParams,
      cuerpo: cuerpoDe(pedido.postData()),
      sesion: this.sesionDe(pedido.headers()['authorization'])
    });

    await ruta.fulfill({
      status: respuesta.estado,
      contentType: 'application/json',
      body: JSON.stringify(respuesta.cuerpo)
    });
  }

  /** Descuenta una falla pendiente, si hay alguna para esta llamada. */
  private tomarFalla(metodo: string, ruta: string): Falla | null {
    const indice = this.fallas.findIndex(
      (item) => item.metodo === metodo && item.ruta === ruta && item.veces > 0
    );

    if (indice === -1) {
      return null;
    }

    const encontrada = this.fallas[indice];

    encontrada.veces -= 1;

    return encontrada;
  }

  /**
   * El usuario del token, releído del estado en cada llamada y no confiado del
   * token: igual que el middleware real, así una baja lógica tiene efecto en el
   * momento.
   */
  private sesionDe(autorizacion: string | undefined): UsuarioSembrado | null {
    if (!autorizacion?.startsWith('Bearer ')) {
      return null;
    }

    const id = Number(autorizacion.replace('Bearer token-', ''));
    const usuario = this.estado.usuarios.find((item) => item.id === id);

    return usuario?.activo ? usuario : null;
  }

  private esAdmin(sesion: UsuarioSembrado): boolean {
    return sesion.rol?.nombre === 'ADMIN';
  }

  // ---------------------------------------------------------------------------
  // Ruteo
  // ---------------------------------------------------------------------------

  private responder(pedido: Pedido): Respuesta {
    const { metodo, ruta } = pedido;

    // El único endpoint público: sin él no habría con qué pedir nada más.
    if (metodo === 'POST' && ruta === '/auth/login') {
      return this.login(pedido.cuerpo);
    }

    const sesion = pedido.sesion;

    if (!sesion) {
      return falla(401, 'Necesitás iniciar sesión para realizar esta acción');
    }

    if (metodo === 'GET' && ruta === '/auth/yo') {
      return ok(sinContrasena(sesion));
    }

    if (ruta === '/roles') {
      return this.exigirAdmin(sesion) ?? ok(this.estado.roles);
    }

    if (ruta.startsWith('/usuarios')) {
      return this.exigirAdmin(sesion) ?? this.usuarios(pedido);
    }

    if (ruta.startsWith('/tipos-cancha')) {
      return this.tiposCancha(pedido, sesion);
    }

    if (ruta.startsWith('/tipos-evento')) {
      return this.tiposEvento(pedido, sesion);
    }

    if (ruta.startsWith('/eventos')) {
      return this.eventos(pedido, sesion);
    }

    if (ruta.startsWith('/canchas')) {
      return this.canchas(pedido, sesion);
    }

    if (ruta.startsWith('/horarios')) {
      return this.horarios(pedido, sesion);
    }

    if (ruta.startsWith('/reservas')) {
      return this.reservas(pedido, sesion);
    }

    return falla(404, 'No se encontró el recurso solicitado');
  }

  /** Las pantallas de administración del complejo son solo para `ADMIN`. */
  private exigirAdmin(sesion: UsuarioSembrado): Respuesta | null {
    return this.esAdmin(sesion) ? null : falla(403, 'No tenés permisos para realizar esta acción');
  }

  /**
   * Consultar canchas, horarios y tipos lo puede hacer cualquiera —el cliente
   * los necesita para reservar—; administrarlos, solo un `ADMIN`.
   */
  private soloLeeElCliente(metodo: string, sesion: UsuarioSembrado): Respuesta | null {
    return metodo === 'GET' ? null : this.exigirAdmin(sesion);
  }

  // ---------------------------------------------------------------------------
  // Sesión
  // ---------------------------------------------------------------------------

  private login(cuerpo: Record<string, unknown>): Respuesta {
    const email = typeof cuerpo['email'] === 'string' ? cuerpo['email'] : '';
    const contrasena = typeof cuerpo['contrasena'] === 'string' ? cuerpo['contrasena'] : '';

    if (!email || !contrasena) {
      return falla(400, 'El email y la contraseña son obligatorios');
    }

    const usuario = this.estado.usuarios.find((item) => item.email === email.trim().toLowerCase());

    if (!usuario || usuario.contrasena !== contrasena) {
      return falla(401, 'Email o contraseña incorrectos');
    }

    if (!usuario.activo) {
      return falla(403, 'La cuenta está dada de baja. Contactate con el complejo.');
    }

    return ok({ token: `token-${usuario.id}`, usuario: sinContrasena(usuario) });
  }

  // ---------------------------------------------------------------------------
  // Usuarios
  // ---------------------------------------------------------------------------

  private usuarios(pedido: Pedido): Respuesta {
    const { metodo, ruta, cuerpo } = pedido;
    const id = idDe(ruta, '/usuarios');

    if (metodo === 'GET' && ruta === '/usuarios') {
      return ok(this.estado.usuarios.map(sinContrasena));
    }

    if (metodo === 'POST' && ruta === '/usuarios') {
      const invalido = this.validarUsuario(cuerpo, null);

      if (invalido) {
        return invalido;
      }

      const creado: UsuarioSembrado = {
        id: proximoId(this.estado.usuarios),
        nombre: `${cuerpo['nombre']}`,
        email: `${cuerpo['email']}`.trim().toLowerCase(),
        telefono: `${cuerpo['telefono']}`,
        activo: cuerpo['activo'] !== false,
        rolId: Number(cuerpo['rolId']),
        rol: this.estado.roles.find((rol) => rol.id === Number(cuerpo['rolId'])),
        contrasena: `${cuerpo['contrasena']}`
      };

      this.estado.usuarios.push(creado);

      return ok(sinContrasena(creado), 201);
    }

    if (id === null) {
      return falla(404, 'No se encontró el recurso solicitado');
    }

    const indice = this.estado.usuarios.findIndex((item) => item.id === id);

    if (indice === -1) {
      return falla(404, 'Usuario no encontrado');
    }

    if (metodo === 'GET') {
      return ok(sinContrasena(this.estado.usuarios[indice]));
    }

    if (metodo === 'PUT') {
      const invalido = this.validarUsuario(cuerpo, id);

      if (invalido) {
        return invalido;
      }

      const anterior = this.estado.usuarios[indice];

      const actualizado: UsuarioSembrado = {
        ...anterior,
        nombre: `${cuerpo['nombre']}`,
        email: `${cuerpo['email']}`.trim().toLowerCase(),
        telefono: `${cuerpo['telefono']}`,
        activo: cuerpo['activo'] !== false,
        rolId: Number(cuerpo['rolId']),
        rol: this.estado.roles.find((rol) => rol.id === Number(cuerpo['rolId'])),
        // Si el formulario no manda contraseña, se conserva la que estaba.
        contrasena: cuerpo['contrasena'] ? `${cuerpo['contrasena']}` : anterior.contrasena
      };

      this.estado.usuarios[indice] = actualizado;

      return ok(sinContrasena(actualizado));
    }

    if (metodo === 'DELETE') {
      if (this.estado.reservas.some((reserva) => reserva.usuarioId === id)) {
        return falla(409, 'No se puede eliminar el usuario porque tiene reservas asociadas');
      }

      this.estado.usuarios.splice(indice, 1);

      return ok({ mensaje: 'Usuario eliminado correctamente' });
    }

    return falla(404, 'No se encontró el recurso solicitado');
  }

  private validarUsuario(cuerpo: Record<string, unknown>, id: number | null): Respuesta | null {
    const email = `${cuerpo['email'] ?? ''}`.trim().toLowerCase();

    if (!cuerpo['nombre']) {
      return falla(400, 'El nombre es obligatorio');
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return falla(400, 'El email es obligatorio y debe tener un formato válido');
    }

    // Al editar, la contraseña es opcional: el formulario la deja vacía para
    // conservar la que ya estaba, porque nunca la recibió.
    if (id === null && !cuerpo['contrasena']) {
      return falla(400, 'La contraseña es obligatoria');
    }

    if (!cuerpo['telefono']) {
      return falla(400, 'El teléfono es obligatorio y debe tener entre 6 y 20 caracteres');
    }

    if (!this.estado.roles.some((rol) => rol.id === Number(cuerpo['rolId']))) {
      return falla(400, 'El rol indicado no existe');
    }

    if (this.estado.usuarios.some((item) => item.email === email && item.id !== id)) {
      return falla(400, 'Ya existe un usuario con ese email');
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Tipos de cancha
  // ---------------------------------------------------------------------------

  private tiposCancha(pedido: Pedido, sesion: UsuarioSembrado): Respuesta {
    const { metodo, ruta, cuerpo } = pedido;
    const prohibido = this.soloLeeElCliente(metodo, sesion);

    if (prohibido) {
      return prohibido;
    }

    const id = idDe(ruta, '/tipos-cancha');
    const nombre = `${cuerpo['nombre'] ?? ''}`.trim();
    const descripcion = `${cuerpo['descripcion'] ?? ''}`.trim();

    const repetido = (): boolean =>
      this.estado.tiposCancha.some(
        (tipo) => tipo.nombre.toLowerCase() === nombre.toLowerCase() && tipo.id !== id
      );

    if (metodo === 'GET' && ruta === '/tipos-cancha') {
      return ok(this.estado.tiposCancha);
    }

    if (metodo === 'POST') {
      if (!nombre || !descripcion) {
        return falla(400, 'Nombre y descripción son obligatorios');
      }

      if (repetido()) {
        return falla(400, 'Ya existe un tipo de cancha con ese nombre');
      }

      const creado = { id: proximoId(this.estado.tiposCancha), nombre, descripcion };

      this.estado.tiposCancha.push(creado);

      return ok(creado, 201);
    }

    const indice = this.estado.tiposCancha.findIndex((tipo) => tipo.id === id);

    if (indice === -1) {
      return falla(404, 'Tipo de cancha no encontrado');
    }

    if (metodo === 'GET') {
      return ok(this.estado.tiposCancha[indice]);
    }

    if (metodo === 'PUT') {
      if (!nombre || !descripcion) {
        return falla(400, 'Nombre y descripción son obligatorios');
      }

      if (repetido()) {
        return falla(400, 'Ya existe un tipo de cancha con ese nombre');
      }

      const actualizado = { id: id as number, nombre, descripcion };

      this.estado.tiposCancha[indice] = actualizado;

      return ok(actualizado);
    }

    if (metodo === 'DELETE') {
      if (this.estado.canchas.some((cancha) => cancha.tipoCanchaId === id)) {
        return falla(409, 'No se puede eliminar el tipo de cancha porque tiene canchas asociadas');
      }

      this.estado.tiposCancha.splice(indice, 1);

      return ok({ mensaje: 'Tipo de cancha eliminado correctamente' });
    }

    return falla(404, 'No se encontró el recurso solicitado');
  }

  // ---------------------------------------------------------------------------
  // Tipos de evento
  // ---------------------------------------------------------------------------

  private tiposEvento(pedido: Pedido, sesion: UsuarioSembrado): Respuesta {
    const { metodo, ruta, cuerpo } = pedido;
    const prohibido = this.soloLeeElCliente(metodo, sesion);

    if (prohibido) {
      return prohibido;
    }

    const id = idDe(ruta, '/tipos-evento');
    const nombre = `${cuerpo['nombre'] ?? ''}`.trim();

    const repetido = (): boolean =>
      this.estado.tiposEvento.some(
        (tipo) => tipo.nombre.toLowerCase() === nombre.toLowerCase() && tipo.id !== id
      );

    if (metodo === 'GET' && ruta === '/tipos-evento') {
      return ok(this.estado.tiposEvento);
    }

    if (metodo === 'POST') {
      if (!nombre) {
        return falla(400, 'El nombre es obligatorio');
      }

      if (repetido()) {
        return falla(400, 'Ya existe un tipo de evento con ese nombre');
      }

      const creado = { id: proximoId(this.estado.tiposEvento), nombre };

      this.estado.tiposEvento.push(creado);

      return ok(creado, 201);
    }

    const indice = this.estado.tiposEvento.findIndex((tipo) => tipo.id === id);

    if (indice === -1) {
      return falla(404, 'Tipo de evento no encontrado');
    }

    if (metodo === 'GET') {
      return ok(this.estado.tiposEvento[indice]);
    }

    if (metodo === 'PUT') {
      if (!nombre) {
        return falla(400, 'El nombre es obligatorio');
      }

      if (repetido()) {
        return falla(400, 'Ya existe un tipo de evento con ese nombre');
      }

      const actualizado = { id: id as number, nombre };

      this.estado.tiposEvento[indice] = actualizado;

      return ok(actualizado);
    }

    if (metodo === 'DELETE') {
      // La clave foránea de Evento es la que frena el borrado en el backend; el
      // controller traduce ese error de Prisma a este 409.
      if (this.estado.eventos.some((evento) => evento.tipoEventoId === id)) {
        return falla(
          409,
          'No se puede eliminar el tipo de evento porque tiene eventos asociados'
        );
      }

      this.estado.tiposEvento.splice(indice, 1);

      return ok({ mensaje: 'Tipo de evento eliminado correctamente' });
    }

    return falla(404, 'No se encontró el recurso solicitado');
  }

  // ---------------------------------------------------------------------------
  // Canchas
  // ---------------------------------------------------------------------------

  /** La cancha con su tipo anidado, como la devuelve el backend. */
  private conTipo(cancha: Cancha): Cancha {
    return {
      ...cancha,
      tipoCancha: this.estado.tiposCancha.find((tipo) => tipo.id === cancha.tipoCanchaId)
    };
  }

  private canchas(pedido: Pedido, sesion: UsuarioSembrado): Respuesta {
    const { metodo, ruta, cuerpo } = pedido;
    const prohibido = this.soloLeeElCliente(metodo, sesion);

    if (prohibido) {
      return prohibido;
    }

    const id = idDe(ruta, '/canchas');

    if (metodo === 'GET' && ruta === '/canchas') {
      return ok(this.estado.canchas.map((cancha) => this.conTipo(cancha)));
    }

    const datos = {
      nombre: `${cuerpo['nombre'] ?? ''}`.trim(),
      precioPorHora: Number(cuerpo['precioPorHora']),
      estado: `${cuerpo['estado'] ?? ''}`,
      tipoCanchaId: Number(cuerpo['tipoCanchaId'])
    };

    const invalido = (): Respuesta | null => {
      if (!datos.nombre) {
        return falla(400, 'El nombre es obligatorio');
      }

      if (!(datos.precioPorHora > 0)) {
        return falla(400, 'El precio por hora debe ser un número mayor a cero');
      }

      if (datos.estado !== 'DISPONIBLE' && datos.estado !== 'MANTENIMIENTO') {
        return falla(400, 'El estado debe ser DISPONIBLE o MANTENIMIENTO');
      }

      if (!this.estado.tiposCancha.some((tipo) => tipo.id === datos.tipoCanchaId)) {
        return falla(400, 'El tipo de cancha indicado no existe');
      }

      const repetida = this.estado.canchas.some(
        (cancha) => cancha.nombre.toLowerCase() === datos.nombre.toLowerCase() && cancha.id !== id
      );

      if (repetida) {
        return falla(400, 'Ya existe una cancha con ese nombre');
      }

      return null;
    };

    if (metodo === 'POST') {
      const error = invalido();

      if (error) {
        return error;
      }

      const creada: Cancha = {
        id: proximoId(this.estado.canchas),
        nombre: datos.nombre,
        precioPorHora: datos.precioPorHora,
        estado: datos.estado as Cancha['estado'],
        tipoCanchaId: datos.tipoCanchaId
      };

      this.estado.canchas.push(creada);

      return ok(this.conTipo(creada), 201);
    }

    const indice = this.estado.canchas.findIndex((cancha) => cancha.id === id);

    if (indice === -1) {
      return falla(404, 'Cancha no encontrada');
    }

    if (metodo === 'GET') {
      return ok(this.conTipo(this.estado.canchas[indice]));
    }

    if (metodo === 'PUT') {
      const error = invalido();

      if (error) {
        return error;
      }

      const actualizada: Cancha = {
        id: id as number,
        nombre: datos.nombre,
        precioPorHora: datos.precioPorHora,
        estado: datos.estado as Cancha['estado'],
        tipoCanchaId: datos.tipoCanchaId
      };

      this.estado.canchas[indice] = actualizada;

      return ok(this.conTipo(actualizada));
    }

    if (metodo === 'DELETE') {
      if (this.estado.horarios.some((horario) => horario.canchaId === id)) {
        return falla(409, 'No se puede eliminar la cancha porque tiene horarios asociados');
      }

      this.estado.canchas.splice(indice, 1);

      return ok({ mensaje: 'Cancha eliminada correctamente' });
    }

    return falla(404, 'No se encontró el recurso solicitado');
  }

  // ---------------------------------------------------------------------------
  // Horarios
  // ---------------------------------------------------------------------------

  /** El turno con su cancha anidada, como lo devuelve el backend. */
  private conCancha(horario: Horario): Horario {
    const cancha = this.estado.canchas.find((item) => item.id === horario.canchaId);

    return { ...horario, cancha: cancha ? this.conTipo(cancha) : undefined };
  }

  private horarios(pedido: Pedido, sesion: UsuarioSembrado): Respuesta {
    const { metodo, ruta, parametros, cuerpo } = pedido;
    const prohibido = this.soloLeeElCliente(metodo, sesion);

    if (prohibido) {
      return prohibido;
    }

    const id = idDe(ruta, '/horarios');

    if (metodo === 'GET' && ruta === '/horarios') {
      const canchaId = parametros.get('canchaId');
      const fecha = parametros.get('fecha');
      const disponible = parametros.get('disponible');

      const filtrados = this.estado.horarios.filter((horario) => {
        if (canchaId !== null && horario.canchaId !== Number(canchaId)) {
          return false;
        }

        if (fecha !== null && horario.fecha !== fecha) {
          return false;
        }

        if (disponible !== null && horario.disponible !== (disponible === 'true')) {
          return false;
        }

        return true;
      });

      return ok(filtrados.map((horario) => this.conCancha(horario)));
    }

    const datos = {
      fecha: `${cuerpo['fecha'] ?? ''}`,
      horaInicio: `${cuerpo['horaInicio'] ?? ''}`,
      horaFin: `${cuerpo['horaFin'] ?? ''}`,
      disponible: cuerpo['disponible'] !== false,
      canchaId: Number(cuerpo['canchaId'])
    };

    const invalido = (): Respuesta | null => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
        return falla(400, 'La fecha es obligatoria y debe tener el formato AAAA-MM-DD');
      }

      if (!/^\d{2}:\d{2}$/.test(datos.horaInicio) || !/^\d{2}:\d{2}$/.test(datos.horaFin)) {
        return falla(400, 'Las horas son obligatorias y deben tener el formato HH:mm');
      }

      if (minutosDe(datos.horaFin) <= minutosDe(datos.horaInicio)) {
        return falla(400, 'La hora de fin debe ser posterior a la de inicio');
      }

      if (!this.estado.canchas.some((cancha) => cancha.id === datos.canchaId)) {
        return falla(400, 'La cancha indicada no existe');
      }

      const seSuperpone = this.estado.horarios.some(
        (horario) =>
          horario.id !== id &&
          horario.canchaId === datos.canchaId &&
          horario.fecha === datos.fecha &&
          minutosDe(horario.horaInicio) < minutosDe(datos.horaFin) &&
          minutosDe(datos.horaInicio) < minutosDe(horario.horaFin)
      );

      if (seSuperpone) {
        return falla(409, 'La cancha ya tiene un horario que se superpone con ese');
      }

      return null;
    };

    if (metodo === 'POST') {
      const error = invalido();

      if (error) {
        return error;
      }

      const creado: Horario = { id: proximoId(this.estado.horarios), ...datos };

      this.estado.horarios.push(creado);

      return ok(this.conCancha(creado), 201);
    }

    const indice = this.estado.horarios.findIndex((horario) => horario.id === id);

    if (indice === -1) {
      return falla(404, 'Horario no encontrado');
    }

    if (metodo === 'GET') {
      return ok(this.conCancha(this.estado.horarios[indice]));
    }

    if (metodo === 'PUT') {
      const error = invalido();

      if (error) {
        return error;
      }

      const actualizado: Horario = { id: id as number, ...datos };

      this.estado.horarios[indice] = actualizado;

      return ok(this.conCancha(actualizado));
    }

    if (metodo === 'DELETE') {
      this.estado.horarios.splice(indice, 1);

      return ok({ mensaje: 'Horario eliminado correctamente' });
    }

    return falla(404, 'No se encontró el recurso solicitado');
  }

  // ---------------------------------------------------------------------------
  // Reservas
  // ---------------------------------------------------------------------------

  /** La reserva con sus tres relaciones, como la devuelve el backend. */
  private conRelaciones(reserva: Reserva): Reserva {
    const usuario = this.estado.usuarios.find((item) => item.id === reserva.usuarioId);
    const cancha = this.estado.canchas.find((item) => item.id === reserva.canchaId);
    const horario = this.estado.horarios.find((item) => item.id === reserva.horarioId);

    return {
      ...reserva,
      usuario: usuario ? sinContrasena(usuario) : undefined,
      cancha: cancha ? this.conTipo(cancha) : undefined,
      horario: horario,
      // El backend lo incluye en todas sus respuestas de reserva, y viene `null`
      // en las que son un partido y nada más.
      evento: this.estado.eventos.find((evento) => evento.reservaId === reserva.id) ?? null
    };
  }

  private reservas(pedido: Pedido, sesion: UsuarioSembrado): Respuesta {
    const { metodo, ruta, parametros, cuerpo } = pedido;

    if (metodo === 'GET' && ruta === '/reservas') {
      const canchaId = parametros.get('canchaId');
      const fecha = parametros.get('fecha');
      const estado = parametros.get('estado');

      // Al cliente el backend le impone su propio usuario: no hay filtro que
      // pueda mandar para ver las reservas de otro.
      const usuarioId = this.esAdmin(sesion) ? parametros.get('usuarioId') : `${sesion.id}`;

      const filtradas = this.estado.reservas.filter((reserva) => {
        if (usuarioId !== null && reserva.usuarioId !== Number(usuarioId)) {
          return false;
        }

        if (canchaId !== null && reserva.canchaId !== Number(canchaId)) {
          return false;
        }

        if (fecha !== null && reserva.fecha !== fecha) {
          return false;
        }

        if (estado !== null && reserva.estado !== estado) {
          return false;
        }

        return true;
      });

      return ok(filtradas.map((reserva) => this.conRelaciones(reserva)));
    }

    if (metodo === 'POST' && ruta === '/reservas') {
      return this.crearReserva(cuerpo, sesion);
    }

    const aCancelar = /^\/reservas\/(\d+)\/cancelar$/.exec(ruta);

    if (metodo === 'PUT' && aCancelar) {
      return this.cancelarReserva(Number(aCancelar[1]), sesion);
    }

    const id = idDe(ruta, '/reservas');

    if (id === null) {
      return falla(404, 'No se encontró el recurso solicitado');
    }

    const modificable = this.buscarModificable(id, sesion);

    if ('mensaje' in modificable) {
      return falla(modificable.codigo, modificable.mensaje);
    }

    if (metodo === 'GET') {
      return ok(this.conRelaciones(modificable.reserva));
    }

    if (metodo === 'PUT') {
      return this.reprogramarReserva(modificable.reserva, cuerpo);
    }

    return falla(404, 'No se encontró el recurso solicitado');
  }

  private crearReserva(cuerpo: Record<string, unknown>, sesion: UsuarioSembrado): Respuesta {
    const horarioId = Number(cuerpo['horarioId']);

    if (!horarioId) {
      return falla(400, 'El turno es obligatorio');
    }

    // El dueño sale de la sesión: solo un administrador puede reservar a nombre
    // de otro, y si un cliente manda `usuarioId` no cambia nada.
    const usuarioId = this.esAdmin(sesion) ? Number(cuerpo['usuarioId'] ?? sesion.id) : sesion.id;
    const usuario = this.estado.usuarios.find((item) => item.id === usuarioId);

    if (!usuario) {
      return falla(400, 'El usuario indicado no existe');
    }

    if (!usuario.activo) {
      return falla(400, 'El usuario está dado de baja y no puede reservar');
    }

    const horario = this.estado.horarios.find((item) => item.id === horarioId);

    if (!horario) {
      return falla(400, 'El turno indicado no existe');
    }

    const invalido = this.validarTurno(horario);

    if (invalido) {
      return invalido;
    }

    const creada: Reserva = {
      id: proximoId(this.estado.reservas),
      // Se copian del turno en vez de leerse por la relación: así la reserva
      // queda como registro histórico si el turno se edita después.
      fecha: horario.fecha,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
      estado: 'CONFIRMADA',
      precioTotal: this.precioDe(horario),
      usuarioId: usuarioId,
      canchaId: horario.canchaId,
      horarioId: horario.id
    };

    horario.disponible = false;
    this.estado.reservas.push(creada);

    return ok(this.conRelaciones(creada), 201);
  }

  private reprogramarReserva(reserva: Reserva, cuerpo: Record<string, unknown>): Respuesta {
    const horarioId = Number(cuerpo['horarioId']);

    if (!horarioId) {
      return falla(400, 'El turno es obligatorio');
    }

    if (horarioId === reserva.horarioId) {
      return falla(400, 'La reserva ya está en ese turno');
    }

    const nuevo = this.estado.horarios.find((item) => item.id === horarioId);

    if (!nuevo) {
      return falla(400, 'El turno indicado no existe');
    }

    const invalido = this.validarTurno(nuevo);

    if (invalido) {
      return invalido;
    }

    const viejo = this.estado.horarios.find((item) => item.id === reserva.horarioId);

    // Se toma el turno nuevo antes de soltar el viejo, igual que la transacción
    // del backend.
    nuevo.disponible = false;

    if (viejo) {
      viejo.disponible = true;
    }

    reserva.fecha = nuevo.fecha;
    reserva.horaInicio = nuevo.horaInicio;
    reserva.horaFin = nuevo.horaFin;
    reserva.canchaId = nuevo.canchaId;
    reserva.horarioId = nuevo.id;
    reserva.precioTotal = this.precioDe(nuevo);

    return ok(this.conRelaciones(reserva));
  }

  private cancelarReserva(id: number, sesion: UsuarioSembrado): Respuesta {
    const modificable = this.buscarModificable(id, sesion);

    if ('mensaje' in modificable) {
      return falla(modificable.codigo, modificable.mensaje);
    }

    const reserva = modificable.reserva;
    const horario = this.estado.horarios.find((item) => item.id === reserva.horarioId);

    reserva.estado = 'CANCELADA';

    // Cancelar no borra: la fila queda como historial y el turno vuelve a la
    // lista de libres.
    if (horario) {
      horario.disponible = true;
    }

    return ok(this.conRelaciones(reserva));
  }

  /**
   * Las tres reglas que comparten reprogramar y cancelar: la reserva tiene que
   * existir, ser de quien la pide y todavía poder tocarse.
   */
  private buscarModificable(
    id: number,
    sesion: UsuarioSembrado
  ): { reserva: Reserva } | { codigo: number; mensaje: string } {
    const reserva = this.estado.reservas.find((item) => item.id === id);

    if (!reserva) {
      return { codigo: 404, mensaje: 'Reserva no encontrada' };
    }

    if (!this.esAdmin(sesion) && reserva.usuarioId !== sesion.id) {
      return { codigo: 403, mensaje: 'La reserva es de otro usuario' };
    }

    if (reserva.estado === 'CANCELADA') {
      return { codigo: 409, mensaje: 'La reserva ya está cancelada' };
    }

    if (yaEmpezo(reserva.fecha, reserva.horaInicio)) {
      return { codigo: 400, mensaje: 'La reserva ya empezó y no se puede modificar' };
    }

    return { reserva: reserva };
  }

  /** Un turno sirve si su cancha está habilitada, no empezó y sigue libre. */
  private validarTurno(horario: Horario): Respuesta | null {
    const cancha = this.estado.canchas.find((item) => item.id === horario.canchaId);

    if (cancha?.estado === 'MANTENIMIENTO') {
      return falla(409, 'La cancha está en mantenimiento y no admite reservas');
    }

    if (yaEmpezo(horario.fecha, horario.horaInicio)) {
      return falla(400, 'No se puede reservar un turno que ya empezó');
    }

    if (!horario.disponible) {
      return falla(409, 'El turno ya fue reservado');
    }

    return null;
  }

  /** Precio por hora de la cancha por la duración del turno. */
  private precioDe(horario: Horario): number {
    const cancha = this.estado.canchas.find((item) => item.id === horario.canchaId);
    const horas = (minutosDe(horario.horaFin) - minutosDe(horario.horaInicio)) / 60;

    return (cancha?.precioPorHora ?? 0) * horas;
  }

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------

  /** El evento con su tipo y su reserva, como lo devuelve el backend. */
  private conTipoYReserva(evento: Evento): Evento {
    const tipoEvento = this.estado.tiposEvento.find((item) => item.id === evento.tipoEventoId);
    const reserva = this.estado.reservas.find((item) => item.id === evento.reservaId);

    return {
      ...evento,
      tipoEvento: tipoEvento,
      reserva: reserva ? this.conRelaciones(reserva) : undefined
    };
  }

  /** Un evento es de quien es su reserva; el administrador los gestiona todos. */
  private puedeGestionar(evento: Evento, sesion: UsuarioSembrado): boolean {
    const reserva = this.estado.reservas.find((item) => item.id === evento.reservaId);

    return this.esAdmin(sesion) || reserva?.usuarioId === sesion.id;
  }

  /** Valida lo común al alta y a la edición, con los mensajes del controller. */
  private validarEvento(cuerpo: Record<string, unknown>): Respuesta | null {
    const descripcion = `${cuerpo['descripcion'] ?? ''}`.trim();
    const cantidadPersonas = Number(cuerpo['cantidadPersonas']);

    if (!descripcion) {
      return falla(400, 'La descripción es obligatoria');
    }

    if (!Number.isInteger(cantidadPersonas) || cantidadPersonas <= 0) {
      return falla(400, 'La cantidad de personas debe ser un número entero mayor a cero');
    }

    if (!this.estado.tiposEvento.some((tipo) => tipo.id === Number(cuerpo['tipoEventoId']))) {
      return falla(400, 'El tipo de evento indicado no existe');
    }

    return null;
  }

  private eventos(pedido: Pedido, sesion: UsuarioSembrado): Respuesta {
    const { metodo, ruta, parametros, cuerpo } = pedido;

    if (metodo === 'GET' && ruta === '/eventos') {
      const reservaId = parametros.get('reservaId');

      const filtrados = this.estado.eventos.filter((evento) => {
        if (reservaId && evento.reservaId !== Number(reservaId)) {
          return false;
        }

        // Al cliente el backend le impone sus propias reservas.
        return this.puedeGestionar(evento, sesion);
      });

      return ok(filtrados.map((evento) => this.conTipoYReserva(evento)));
    }

    if (metodo === 'POST' && ruta === '/eventos') {
      return this.crearEvento(cuerpo, sesion);
    }

    const id = idDe(ruta, '/eventos');
    const indice = this.estado.eventos.findIndex((evento) => evento.id === id);

    if (indice === -1) {
      return falla(404, 'Evento no encontrado');
    }

    const evento = this.estado.eventos[indice];

    if (!this.puedeGestionar(evento, sesion)) {
      return falla(403, 'La reserva es de otro usuario');
    }

    if (metodo === 'GET') {
      return ok(this.conTipoYReserva(evento));
    }

    if (metodo === 'PUT') {
      const invalido = this.validarEvento(cuerpo);

      if (invalido) {
        return invalido;
      }

      const reserva = this.estado.reservas.find((item) => item.id === evento.reservaId);

      if (reserva?.estado === 'CANCELADA') {
        return falla(409, 'La reserva está cancelada');
      }

      // El `reservaId` del cuerpo se ignora: un evento no se muda de reserva.
      const actualizado: Evento = {
        ...evento,
        descripcion: `${cuerpo['descripcion']}`.trim(),
        cantidadPersonas: Number(cuerpo['cantidadPersonas']),
        tipoEventoId: Number(cuerpo['tipoEventoId'])
      };

      this.estado.eventos[indice] = actualizado;

      return ok(this.conTipoYReserva(actualizado));
    }

    if (metodo === 'DELETE') {
      // Borrar el evento de una reserva cancelada sí se permite: es limpiar un
      // dato que ya no aplica, no modificarlo.
      this.estado.eventos.splice(indice, 1);

      return ok({ mensaje: 'Evento eliminado correctamente' });
    }

    return falla(404, 'No se encontró el recurso solicitado');
  }

  private crearEvento(cuerpo: Record<string, unknown>, sesion: UsuarioSembrado): Respuesta {
    const invalido = this.validarEvento(cuerpo);

    if (invalido) {
      return invalido;
    }

    const reservaId = Number(cuerpo['reservaId']);

    if (!reservaId) {
      return falla(400, 'La reserva es obligatoria');
    }

    const reserva = this.estado.reservas.find((item) => item.id === reservaId);

    if (!reserva) {
      return falla(400, 'La reserva indicada no existe');
    }

    if (!this.esAdmin(sesion) && reserva.usuarioId !== sesion.id) {
      return falla(403, 'La reserva es de otro usuario');
    }

    if (reserva.estado === 'CANCELADA') {
      return falla(409, 'La reserva está cancelada');
    }

    if (this.estado.eventos.some((evento) => evento.reservaId === reservaId)) {
      return falla(409, 'La reserva ya tiene un evento');
    }

    const creado: Evento = {
      id: proximoId(this.estado.eventos),
      descripcion: `${cuerpo['descripcion']}`.trim(),
      cantidadPersonas: Number(cuerpo['cantidadPersonas']),
      tipoEventoId: Number(cuerpo['tipoEventoId']),
      reservaId: reservaId
    };

    this.estado.eventos.push(creado);

    return ok(this.conTipoYReserva(creado), 201);
  }

}
