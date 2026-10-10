import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipamiento, EquipamientoDto } from '../models/equipamiento';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EquipamientoService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/equipamientos`;

  listar(horarioId?: number): Observable<Equipamiento[]> {
    const params = horarioId === undefined ? undefined : new HttpParams().set('horarioId', horarioId);

    return this.http.get<Equipamiento[]>(this.url, { params });
  }

  obtener(id: number): Observable<Equipamiento> {
    return this.http.get<Equipamiento>(`${this.url}/${id}`);
  }

  crear(equipamiento: EquipamientoDto): Observable<Equipamiento> {
    return this.http.post<Equipamiento>(this.url, equipamiento);
  }

  actualizar(id: number, equipamiento: EquipamientoDto): Observable<Equipamiento> {
    return this.http.put<Equipamiento>(`${this.url}/${id}`, equipamiento);
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/${id}`);
  }

}
