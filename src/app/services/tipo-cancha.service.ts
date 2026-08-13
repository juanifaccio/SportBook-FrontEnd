import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoCancha, TipoCanchaDto } from '../models/tipo-cancha';
import { environment } from '../../environments/environment';

/**
 * Acceso a los endpoints de tipos de cancha del backend.
 *
 * Es la implementación de referencia para el resto de los servicios: la URL sale
 * siempre del ambiente (nunca literal en el código) y el manejo de errores queda
 * a cargo del interceptor, así que acá no se atrapan.
 */
@Injectable({
  providedIn: 'root'
})
export class TipoCanchaService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/tipos-cancha`;

  listar(): Observable<TipoCancha[]> {
    return this.http.get<TipoCancha[]>(this.url);
  }

  obtener(id: number): Observable<TipoCancha> {
    return this.http.get<TipoCancha>(`${this.url}/${id}`);
  }

  crear(tipoCancha: TipoCanchaDto): Observable<TipoCancha> {
    return this.http.post<TipoCancha>(this.url, tipoCancha);
  }

  actualizar(id: number, tipoCancha: TipoCanchaDto): Observable<TipoCancha> {
    return this.http.put<TipoCancha>(`${this.url}/${id}`, tipoCancha);
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/${id}`);
  }

}
