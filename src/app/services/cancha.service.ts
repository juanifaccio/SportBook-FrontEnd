import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cancha, CanchaDto, FiltrosCancha } from '../models/cancha';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CanchaService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/canchas`;

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
