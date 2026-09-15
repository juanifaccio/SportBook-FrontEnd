import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipamiento, EquipamientoDto } from '../models/equipamiento';
import { environment } from '../../environments/environment';

/**
 * Acceso a los endpoints de equipamiento del backend.
 *
 * Sigue el mismo criterio que `TipoCanchaService`: la URL sale del ambiente y
 * los errores quedan a cargo del interceptor, así que acá no se atrapan. Sin
 * `HttpParams` porque este listado no lleva filtro: el que pide la propuesta es
 * el de canchas.
 */
@Injectable({
  providedIn: 'root'
})
export class EquipamientoService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/equipamientos`;

  listar(): Observable<Equipamiento[]> {
    return this.http.get<Equipamiento[]>(this.url);
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
