import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-no-encontrado',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './no-encontrado.html'
})
export class NoEncontradoComponent {}
