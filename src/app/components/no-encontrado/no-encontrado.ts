import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Pantalla para cualquier URL que no corresponda a una ruta conocida. */
@Component({
  selector: 'app-no-encontrado',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './no-encontrado.html'
})
export class NoEncontradoComponent {}
