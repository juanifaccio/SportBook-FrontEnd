import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FiltrosReserva, ReprogramarDto, Reserva, ReservaDto } from '../models/reserva';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReservaService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/reservas`;

  listar(filtros: FiltrosReserva = {}): Observable<Reserva[]> {
    let params = new HttpParams();

    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined) {
        params = params.set(clave, valor);
      }
    }

    return this.http.get<Reserva[]>(this.url, { params });
  }

  obtener(id: number): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.url}/${id}`);
  }

  crear(reserva: ReservaDto): Observable<Reserva> {
    return this.http.post<Reserva>(this.url, reserva);
  }

  reprogramar(id: number, datos: ReprogramarDto): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.url}/${id}`, datos);
  }

  cancelar(id: number): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.url}/${id}/cancelar`, {});
  }

}
