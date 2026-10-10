import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Evento, EventoDto, EventoEdicionDto, FiltrosEvento } from '../models/evento';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventoService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/eventos`;

  listar(filtros: FiltrosEvento = {}): Observable<Evento[]> {
    let params = new HttpParams();

    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined) {
        params = params.set(clave, valor);
      }
    }

    return this.http.get<Evento[]>(this.url, { params });
  }

  obtener(id: number): Observable<Evento> {
    return this.http.get<Evento>(`${this.url}/${id}`);
  }

  crear(evento: EventoDto): Observable<Evento> {
    return this.http.post<Evento>(this.url, evento);
  }

  actualizar(id: number, evento: EventoEdicionDto): Observable<Evento> {
    return this.http.put<Evento>(`${this.url}/${id}`, evento);
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/${id}`);
  }

}
