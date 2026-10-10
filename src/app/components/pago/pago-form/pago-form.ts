import { Component, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CurrencyPipe } from '@angular/common';
import {
  ETIQUETAS_METODO_PAGO,
  METODOS_PAGO,
  MetodoPago,
  Pago,
  PagoDto,
  saldoDe
} from '../../../models/pago';
import {
  Reserva,
  etiquetaDeReserva,
  etiquetaDeReservaConUsuario
} from '../../../models/reserva';

@Component({
  selector: 'app-pago-form',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './pago-form.html',
  styleUrl: './pago-form.css'
})
export class PagoFormComponent {
  readonly pago = input<Pago | null>(null);

  readonly reservas = input<Reserva[]>([]);

  readonly guardando = input(false);

  readonly guardar = output<PagoDto>();

  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected readonly metodos = METODOS_PAGO;
  protected readonly etiquetasMetodo = ETIQUETAS_METODO_PAGO;
  protected readonly etiquetaDeReservaConUsuario = etiquetaDeReservaConUsuario;
  protected readonly etiquetaDeReserva = etiquetaDeReserva;

  protected formulario = this.fb.group({
    reservaId: this.fb.control<number | null>(null, Validators.required),
    monto: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    metodo: this.fb.control<MetodoPago | null>(null, Validators.required)
  });

  constructor() {
    effect(() => {
      const pago = this.pago();

      this.formulario.reset({
        reservaId: pago?.reservaId ?? null,
        monto: pago?.monto ?? null,
        metodo: pago?.metodo ?? null
      });
    });

    this.formulario.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.revisarSaldo());
  }

  private revisarSaldo(): void {
    const control = this.formulario.controls.monto;
    const errores: Record<string, unknown> = { ...(control.errors ?? {}) };

    if (this.superaElSaldo) {
      errores['superaSaldo'] = true;
    } else {
      delete errores['superaSaldo'];
    }

    control.setErrors(Object.keys(errores).length > 0 ? errores : null, { emitEvent: false });
  }

  protected get esEdicion(): boolean {
    return this.pago() !== null;
  }

  protected get saldo(): number | null {
    const reserva = this.reservaElegida;

    return reserva ? saldoDe(reserva) : null;
  }

  protected get reservaElegida(): Reserva | null {
    const id = this.formulario.controls.reservaId.value;

    return this.reservas().find((candidata) => candidata.id === id) ?? null;
  }

  protected get superaElSaldo(): boolean {
    const monto = this.formulario.controls.monto.value;
    const saldo = this.saldo;

    return monto !== null && saldo !== null && monto > saldo;
  }

  protected get resumenDelPago(): string {
    const pago = this.pago();

    if (!pago) {
      return '';
    }

    return pago.reserva
      ? etiquetaDeReservaConUsuario(pago.reserva)
      : `Reserva #${pago.reservaId}`;
  }

  protected alEnviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { reservaId, monto, metodo } = this.formulario.getRawValue();

    this.guardar.emit({
      reservaId: Number(reservaId),
      monto: Number(monto),
      metodo: metodo as MetodoPago
    });
  }

  protected alCancelar(): void {
    this.cancelar.emit();
  }

}
