import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Rol } from '../models/rol';
import { environment } from '../../environments/environment';

/**
 * Acceso al catálogo de roles del backend.
 *
 * Solo lista: los roles son los niveles de acceso de la aplicación y se siembran
 * en la migración, así que el backend no expone alta, edición ni baja.
 */
@Injectable({
  providedIn: 'root'
})
export class RolService {

  private http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/roles`;

  listar(): Observable<Rol[]> {
    return this.http.get<Rol[]>(this.url);
  }

}
