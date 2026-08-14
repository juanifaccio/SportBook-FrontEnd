import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cancha, CanchaDto } from '../models/cancha';
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

  listar(): Observable<Cancha[]> {
    return this.http.get<Cancha[]>(this.url);
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
