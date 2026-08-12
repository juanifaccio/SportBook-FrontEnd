import { Component, OnInit, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { TipoCanchaService } from '../../services/tipo-cancha.service';
import { TipoCancha } from '../../models/tipo-cancha';

@Component({
  selector: 'app-tipo-cancha',
  imports: [JsonPipe],
  templateUrl: './tipo-cancha.html',
  styleUrl: './tipo-cancha.css'
})
export class TipoCanchaComponent implements OnInit {

  tiposCancha = signal<TipoCancha[]>([]);

  constructor(private tipoCanchaService: TipoCanchaService) {}

  ngOnInit(): void {
    this.tipoCanchaService.listarTiposCancha().subscribe({
      next: (datos) => {
        console.log('Tipos de cancha recibidos:', datos);
        this.tiposCancha.set(datos);
      },
      error: (error) => {
        console.error('Error al obtener los tipos de cancha:', error);
      }
    });
  }

}