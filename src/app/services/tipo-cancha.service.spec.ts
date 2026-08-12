import { TestBed } from '@angular/core/testing';

import { TipoCancha } from './tipo-cancha';

describe('TipoCancha', () => {
  let service: TipoCancha;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoCancha);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
