import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Credenciales, RespuestaLogin } from '../../models/sesion';
import { CambioContrasenaDto, PerfilDto, Usuario } from '../../models/usuario';
import { ROLES } from '../../models/rol';
import { environment } from '../../../environments/environment';

/**
 * Claves con las que la sesión sobrevive a recargar la página. Se exportan para
 * que los tests puedan dejar una sesión armada sin repetir los literales.
 */
export const CLAVE_TOKEN = 'sportbook.token';
export const CLAVE_USUARIO = 'sportbook.usuario';

/**
 * Sesión del usuario: quién está conectado y con qué token.
 *
 * El token y el usuario se guardan en `localStorage` para que recargar la página
 * o volver al día siguiente no obligue a iniciar sesión de nuevo. El usuario
 * guardado es una copia: puede haber quedado vieja —le cambiaron el rol, lo
 * dieron de baja—, así que al arrancar se la revalida contra el backend con
 * `restaurar()`.
 *
 * Que el frontend sepa el rol sirve para no ofrecer pantallas que el usuario no
 * puede usar, no para autorizarlo: eso lo decide el backend en cada request.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);

  private router = inject(Router);

  private readonly url = `${environment.apiUrl}/auth`;

  private readonly _usuario = signal<Usuario | null>(leerUsuarioGuardado());

  /** Usuario conectado, o `null` si no hay sesión. */
  readonly usuario = this._usuario.asReadonly();

  readonly autenticado = computed(() => this._usuario() !== null);

  readonly esAdmin = computed(() => this._usuario()?.rol?.nombre === ROLES.ADMIN);

  /** El token que el interceptor adjunta a cada request. */
  get token(): string | null {
    return localStorage.getItem(CLAVE_TOKEN);
  }

  iniciarSesion(credenciales: Credenciales): Observable<RespuestaLogin> {
    return this.http
      .post<RespuestaLogin>(`${this.url}/login`, credenciales)
      .pipe(tap((respuesta) => this.guardar(respuesta)));
  }

  /**
   * Vuelve a pedir el perfil al backend con el token guardado.
   *
   * Se llama al arrancar la aplicación. Si el token venció o la cuenta ya no
   * está, el request falla con 401 o 403 y el interceptor cierra la sesión, que
   * es exactamente lo que corresponde.
   */
  restaurar(): void {
    if (!this.token) {
      return;
    }

    this.http.get<Usuario>(`${this.url}/yo`).subscribe({
      next: (usuario) => this.guardarUsuario(usuario),
      // El interceptor ya se encargó de cerrar la sesión y avisarle al usuario.
      error: () => {}
    });
  }

  /**
   * Guarda los datos propios del usuario conectado.
   *
   * Al volver, refresca la sesión con lo que devolvió el backend: el nombre se
   * ve en la barra superior, así que si quedara la copia vieja el usuario
   * seguiría viendo el nombre anterior hasta recargar.
   */
  actualizarPerfil(perfil: PerfilDto): Observable<Usuario> {
    return this.http
      .put<Usuario>(`${this.url}/yo`, perfil)
      .pipe(tap((usuario) => this.guardarUsuario(usuario)));
  }

  /**
   * Cambia la contraseña del usuario conectado.
   *
   * No toca la sesión: el token sigue valiendo después del cambio, así que no
   * hay nada que actualizar ni motivo para echar al usuario.
   */
  cambiarContrasena(cambio: CambioContrasenaDto): Observable<{ mensaje: string }> {
    return this.http.put<{ mensaje: string }>(`${this.url}/yo/contrasena`, cambio);
  }

  /**
   * Cierra la sesión y vuelve al login.
   *
   * No hay nada que avisarle al backend: el token no se guarda del otro lado,
   * así que cerrar sesión es dejar de tenerlo.
   */
  cerrarSesion(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    this._usuario.set(null);
    this.router.navigate(['/login']);
  }

  private guardar(respuesta: RespuestaLogin): void {
    localStorage.setItem(CLAVE_TOKEN, respuesta.token);
    this.guardarUsuario(respuesta.usuario);
  }

  /** Deja el usuario en memoria y en el navegador, que tienen que ir juntos. */
  private guardarUsuario(usuario: Usuario): void {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    this._usuario.set(usuario);
  }

}

/**
 * Lee el usuario guardado al arrancar. Cualquier cosa rara —no hay token, el
 * JSON quedó a medias, alguien lo editó a mano— se trata como "no hay sesión":
 * es la opción segura, y como mucho obliga a iniciar sesión otra vez.
 */
function leerUsuarioGuardado(): Usuario | null {
  if (!localStorage.getItem(CLAVE_TOKEN)) {
    return null;
  }

  const guardado = localStorage.getItem(CLAVE_USUARIO);

  if (!guardado) {
    return null;
  }

  try {
    return JSON.parse(guardado) as Usuario;
  } catch {
    return null;
  }
}
