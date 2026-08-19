import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Horario, HorarioDto, LoteHorarioDto, ResultadoLote } from '../models/horario';
import { environment } from '../../environments/environment';

/**
 * Acceso a los endpoints de horarios del backend.
 *
 * Sigue el mismo criterio que el resto de los servicios: la URL sale del
 * ambiente y los errores quedan a cargo del interceptor.
 */
@Injectable({
  providedIn: 'root'
})
export class HorarioService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/horarios`;

  /** Los turnos se consultan por cancha; sin filtro devuelve todos. */
  listar(canchaId?: number): Observable<Horario[]> {
    const params =
      canchaId === undefined ? undefined : new HttpParams().set('canchaId', canchaId);

    return this.http.get<Horario[]>(this.url, { params });
  }

  /**
   * Turnos libres de una cancha en un día. Es lo que necesita la pantalla de
   * reservar: los que ya están tomados no se pueden elegir, así que los filtra
   * el backend en vez de traerlos y esconderlos.
   */
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

  /**
   * Genera de una vez todos los turnos de un día.
   *
   * El backend saltea los que se pisen con los ya cargados en vez de rechazar el
   * lote entero, así que la respuesta trae los creados y cuántos quedaron afuera.
   */
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
