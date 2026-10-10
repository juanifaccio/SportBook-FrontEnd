import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Horario, HorarioDto, LoteHorarioDto, ResultadoLote } from '../models/horario';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HorarioService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/horarios`;

  listar(canchaId?: number): Observable<Horario[]> {
    const params =
      canchaId === undefined ? undefined : new HttpParams().set('canchaId', canchaId);

    return this.http.get<Horario[]>(this.url, { params });
  }

  listarDisponibles(canchaId: number, fecha: string): Observable<Horario[]> {
    const params = new HttpParams()
      .set('canchaId', canchaId)
      .set('fecha', fecha)
      .set('disponible', true);

    return this.http.get<Horario[]>(this.url, { params });
  }

  obtener(id: number): Observable<Horario> {
    return this.http.get<Horario>(`${this.url}/${id}`);
  }

  crear(horario: HorarioDto): Observable<Horario> {
    return this.http.post<Horario>(this.url, horario);
  }

  generar(lote: LoteHorarioDto): Observable<ResultadoLote> {
    return this.http.post<ResultadoLote>(`${this.url}/lote`, lote);
  }

  actualizar(id: number, horario: HorarioDto): Observable<Horario> {
    return this.http.put<Horario>(`${this.url}/${id}`, horario);
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/${id}`);
  }

}
