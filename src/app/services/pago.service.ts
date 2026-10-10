import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FiltrosPago, Pago, PagoDto, PagoEdicionDto } from '../models/pago';
import { environment } from '../../environments/environment';

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

  actualizar(id: number, pago: PagoEdicionDto): Observable<Pago> {
    return this.http.put<Pago>(`${this.url}/${id}`, pago);
  }

  anular(id: number): Observable<Pago> {
    return this.http.put<Pago>(`${this.url}/${id}/anular`, {});
  }

}
