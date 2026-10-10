import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoEvento, TipoEventoDto } from '../models/tipo-evento';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TipoEventoService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/tipos-evento`;

  listar(): Observable<TipoEvento[]> {
    return this.http.get<TipoEvento[]>(this.url);
  }

  obtener(id: number): Observable<TipoEvento> {
    return this.http.get<TipoEvento>(`${this.url}/${id}`);
  }

  crear(tipoEvento: TipoEventoDto): Observable<TipoEvento> {
    return this.http.post<TipoEvento>(this.url, tipoEvento);
  }

  actualizar(id: number, tipoEvento: TipoEventoDto): Observable<TipoEvento> {
    return this.http.put<TipoEvento>(`${this.url}/${id}`, tipoEvento);
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/${id}`);
  }

}
