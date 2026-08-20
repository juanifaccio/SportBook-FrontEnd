import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cancha, CanchaDto, FiltrosCancha } from '../models/cancha';
import { environment } from '../../environments/environment';

/**
 * Acceso a los endpoints de canchas del backend.
 *
 * Sigue el mismo criterio que `TipoCanchaService`: la URL sale del ambiente y
 * los errores quedan a cargo del interceptor, así que acá no se atrapan.
 */
@Injectable({
  providedIn: 'root'
})
export class CanchaService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/canchas`;

  /**
   * El listado, opcionalmente filtrado. Las claves sin valor no se mandan: una
   * `tipoCanchaId=` vacía en la query es un filtro inválido para el backend,
   * no la ausencia de filtro.
   */
  listar(filtros: FiltrosCancha = {}): Observable<Cancha[]> {
    let params = new HttpParams();

    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined) {
        params = params.set(clave, valor);
      }
    }

    return this.http.get<Cancha[]>(this.url, { params });
  }

  obtener(id: number): Observable<Cancha> {
    return this.http.get<Cancha>(`${this.url}/${id}`);
  }

  crear(cancha: CanchaDto): Observable<Cancha> {
    return this.http.post<Cancha>(this.url, cancha);
  }

  actualizar(id: number, cancha: CanchaDto): Observable<Cancha> {
    return this.http.put<Cancha>(`${this.url}/${id}`, cancha);
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/${id}`);
  }

}
