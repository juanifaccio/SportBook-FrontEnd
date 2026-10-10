import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';

import { EquipamientoComponent } from './equipamiento';
import { environment } from '../../../environments/environment';

describe('EquipamientoComponent', () => {
  const url = `${environment.apiUrl}/equipamientos`;

  let fixture: ComponentFixture<EquipamientoComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EquipamientoComponent, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(EquipamientoComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('se crea correctamente', () => {
    fixture.detectChanges();
    httpMock.expectOne(url).flush([]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el equipamiento que devuelve el backend', async () => {
    fixture.detectChanges();

    httpMock.expectOne(url).flush([
      { id: 1, nombre: 'Pelota de fútbol', descripcion: 'Número 5', precio: 1500, stock: 10 }
    ]);
    await fixture.whenStable();

    expect(texto()).toContain('Pelota de fútbol');
  });

  it('avisa cuando un artículo está sin stock', async () => {
    fixture.detectChanges();

    httpMock.expectOne(url).flush([
      { id: 1, nombre: 'Pechera', descripcion: 'Talle único', precio: 800, stock: 0 }
    ]);
    await fixture.whenStable();

    expect(texto()).toContain('Sin stock');
  });

  it('muestra el estado vacío cuando no hay equipamiento cargado', async () => {
    fixture.detectChanges();

    httpMock.expectOne(url).flush([]);
    await fixture.whenStable();

    expect(texto()).toContain('Todavía no hay equipamiento');
  });

  it('ofrece reintentar cuando la carga falla', async () => {
    fixture.detectChanges();

    httpMock.expectOne(url).flush(
      { mensaje: 'Error interno' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    await fixture.whenStable();

    expect(texto()).toContain('Reintentar');
  });
});
