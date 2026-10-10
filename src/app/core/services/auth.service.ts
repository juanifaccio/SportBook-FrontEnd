import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Credenciales, RespuestaLogin } from '../../models/sesion';
import { CambioContrasenaDto, PerfilDto, Usuario } from '../../models/usuario';
import { ROLES } from '../../models/rol';
import { environment } from '../../../environments/environment';

export const CLAVE_TOKEN = 'sportbook.token';
export const CLAVE_USUARIO = 'sportbook.usuario';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);

  private router = inject(Router);

  private readonly url = `${environment.apiUrl}/auth`;

  private readonly _usuario = signal<Usuario | null>(leerUsuarioGuardado());

  readonly usuario = this._usuario.asReadonly();

  readonly autenticado = computed(() => this._usuario() !== null);

  readonly esAdmin = computed(() => this._usuario()?.rol?.nombre === ROLES.ADMIN);

  get token(): string | null {
    return localStorage.getItem(CLAVE_TOKEN);
  }

  iniciarSesion(credenciales: Credenciales): Observable<RespuestaLogin> {
    return this.http
      .post<RespuestaLogin>(`${this.url}/login`, credenciales)
      .pipe(tap((respuesta) => this.guardar(respuesta)));
  }

  restaurar(): void {
    if (!this.token) {
      return;
    }

    this.http.get<Usuario>(`${this.url}/yo`).subscribe({
      next: (usuario) => this.guardarUsuario(usuario),
      error: () => {}
    });
  }

  actualizarPerfil(perfil: PerfilDto): Observable<Usuario> {
    return this.http
      .put<Usuario>(`${this.url}/yo`, perfil)
      .pipe(tap((usuario) => this.guardarUsuario(usuario)));
  }

  cambiarContrasena(cambio: CambioContrasenaDto): Observable<{ mensaje: string }> {
    return this.http.put<{ mensaje: string }>(`${this.url}/yo/contrasena`, cambio);
  }

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

  private guardarUsuario(usuario: Usuario): void {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    this._usuario.set(usuario);
  }

}

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
