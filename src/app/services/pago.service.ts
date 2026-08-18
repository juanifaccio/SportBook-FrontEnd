import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FiltrosPago, Pago, PagoDto, PagoEdicionDto } from '../models/pago';
import { environment } from '../../environments/environment';

/**
 * Acceso a los endpoints de pagos del backend.
 *
 * Sigue el mismo criterio que el resto de los servicios: la URL sale del ambiente
 * y los errores quedan a cargo del interceptor.
 *
 * No hay `eliminar`: un pago no se borra, se anula. El backend tampoco expone
 * `DELETE`.
 */
@Injectable({
  providedIn: 'root'
})
export class PagoService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/pagos`;

  listar(filtros: FiltrosPago = {}): Observable<Pago[]> {
    let params = new HttpParams();

    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined) {
        params = params.set(clave, valor);
      }
    }

    return this.http.get<Pago[]>(this.url, { params });
  }

  obtener(id: number): Observable<Pago> {
    return this.http.get<Pago>(`${this.url}/${id}`);
  }

  crear(pago: PagoDto): Observable<Pago> {
    return this.http.post<Pago>(this.url, pago);
  }

  /** Lo único editable es el método con el que se cobró. */
  actualizar(id: number, pago: PagoEdicionDto): Observable<Pago> {
    return this.http.put<Pago>(`${this.url}/${id}`, pago);
  }

  /**
   * Anula el pago y devuelve la reserva al estado que le corresponde. Tiene URL
   * propia en el backend porque no es editar el pago sino cambiarle el estado, y
   * no lleva cuerpo.
   */
  anular(id: number): Observable<Pago> {
    return this.http.put<Pago>(`${this.url}/${id}/anular`, {});
  }

}
