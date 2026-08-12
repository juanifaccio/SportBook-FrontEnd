import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoCancha } from './tipo-cancha';

describe('TipoCancha', () => {
  let component: TipoCancha;
  let fixture: ComponentFixture<TipoCancha>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoCancha],
    }).compileComponents();

    fixture = TestBed.createComponent(TipoCancha);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
