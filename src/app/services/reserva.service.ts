import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FiltrosReserva, Reserva, ReservaDto } from '../models/reserva';
import { environment } from '../../environments/environment';

/**
 * Acceso a los endpoints de reservas del backend.
 *
 * Sigue el mismo criterio que el resto de los servicios: la URL sale del
 * ambiente y los errores quedan a cargo del interceptor.
 *
 * No hay `actualizar` ni `eliminar`: modificar y cancelar una reserva son la
 * tarea #10, y el backend todavía no expone esos verbos.
 */
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

}
