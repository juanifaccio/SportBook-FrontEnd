import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';

import { TipoEventoComponent } from './tipo-evento';
import { environment } from '../../../environments/environment';

describe('TipoEventoComponent', () => {
  const url = `${environment.apiUrl}/tipos-evento`;

  let fixture: ComponentFixture<TipoEventoComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoEventoComponent, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(TipoEventoComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    fixture.detectChanges();
    httpMock.expectOne(url).flush([]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra los tipos de evento que devuelve el backend', async () => {
    fixture.detectChanges();

    httpMock.expectOne(url).flush([{ id: 1, nombre: 'Cumpleaños' }]);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Cumpleaños');
  });

  it('muestra el estado vacío cuando no hay tipos cargados', async () => {
    fixture.detectChanges();

    httpMock.expectOne(url).flush([]);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Todavía no hay tipos de evento');
  });

  it('ofrece reintentar cuando la carga falla', async () => {
    fixture.detectChanges();

    httpMock.expectOne(url).flush(
      { mensaje: 'Error interno' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reintentar');
  });
});
