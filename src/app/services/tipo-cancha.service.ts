import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TipoCancha } from '../models/tipo-cancha';

@Injectable({
  providedIn: 'root'
})
export class TipoCanchaService {

  constructor(private http: HttpClient) {}

  listarTiposCancha() {
    return this.http.get<TipoCancha[]>('http://localhost:3000/api/tipos-cancha');
  }

}