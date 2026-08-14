import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, UsuarioDto } from '../models/usuario';
import { environment } from '../../environments/environment';

/**
 * Acceso a los endpoints de usuarios del backend.
 *
 * Sigue el mismo criterio que `CanchaService`: la URL sale del ambiente y los
 * errores quedan a cargo del interceptor, así que acá no se atrapan.
 */
@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/usuarios`;

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.url);
  }

  obtener(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.url}/${id}`);
  }

  crear(usuario: UsuarioDto): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, usuario);
  }

  actualizar(id: number, usuario: UsuarioDto): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}`, usuario);
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/${id}`);
  }

}
