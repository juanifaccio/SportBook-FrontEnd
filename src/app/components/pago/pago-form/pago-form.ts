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
import { Reserva, etiquetaDeReservaConUsuario } from '../../../models/reserva';

/**
 * Formulario de registro y corrección de un pago.
 *
 * Es un componente presentacional: no conoce el servicio ni el backend. Las
 * reservas del selector llegan por `input`, así que tampoco las pide él.
 *
 * Al corregir, lo único editable es el método: el monto de un pago no se edita
 * —para eso se anula y se registra el correcto— y la reserva tampoco, porque un
 * pago no se muda.
 */
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

  /** Pago a corregir; `null` significa que se está registrando uno nuevo. */
  readonly pago = input<Pago | null>(null);

  /** Opciones del selector de reserva. Solo se usan al registrar. */
  readonly reservas = input<Reserva[]>([]);

  /** Deshabilita los controles mientras el request está en curso. */
  readonly guardando = input(false);

  readonly guardar = output<PagoDto>();

  readonly cancelar = output<void>();

  private fb = inject(FormBuilder);

  protected readonly metodos = METODOS_PAGO;
  protected readonly etiquetasMetodo = ETIQUETAS_METODO_PAGO;
  // Con el nombre del dueño: el que cobra es el administrador, y sin él no
  // sabría a quién le está registrando el pago.
  protected readonly etiquetaDeReservaConUsuario = etiquetaDeReservaConUsuario;

  // El monto y la reserva arrancan en `null` y no en cero: `required` da por
  // válido un 0, así que un control numérico vacío tiene que ser nulo para que
  // el campo se marque como obligatorio.
  protected formulario = this.fb.group({
    reservaId: this.fb.control<number | null>(null, Validators.required),
    monto: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    metodo: this.fb.control<MetodoPago | null>(null, Validators.required)
  });

  constructor() {
    // Cuando cambia el pago recibido, el formulario se recarga con sus datos.
    effect(() => {
      const pago = this.pago();

      this.formulario.reset({
        reservaId: pago?.reservaId ?? null,
        monto: pago?.monto ?? null,
        metodo: pago?.metodo ?? null
      });
    });

    // El tope del monto depende de la reserva elegida, así que no puede ser un
    // `Validators.max` fijo. Se marca el error a mano en cada cambio: hace falta
    // que el control quede inválido de verdad, porque si no Material no muestra
    // el `mat-error` —solo lo hace cuando el campo está en estado de error—.
    this.formulario.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.revisarSaldo());
  }

  /** Marca o limpia el error de "supera el saldo" sin pisar los otros. */
  private revisarSaldo(): void {
    const control = this.formulario.controls.monto;
    const errores: Record<string, unknown> = { ...(control.errors ?? {}) };

    if (this.superaElSaldo) {
      errores['superaSaldo'] = true;
    } else {
      delete errores['superaSaldo'];
    }

    // `emitEvent: false` para no volver a entrar por `valueChanges`.
    control.setErrors(Object.keys(errores).length > 0 ? errores : null, { emitEvent: false });
  }

  protected get esEdicion(): boolean {
    return this.pago() !== null;
  }

  /**
   * Lo que falta pagar de la reserva elegida. Es el mismo cálculo que hace el
   * backend: acá solo sirve para mostrarlo y no dejar cargar de más antes de
   * mandar el request.
   */
  protected get saldo(): number | null {
    const reserva = this.reservas().find(
      (candidata) => candidata.id === this.formulario.controls.reservaId.value
    );

    return reserva ? saldoDe(reserva) : null;
  }

  protected get superaElSaldo(): boolean {
    const monto = this.formulario.controls.monto.value;
    const saldo = this.saldo;

    return monto !== null && saldo !== null && monto > saldo;
  }

  /** Cómo se muestra la reserva y el monto cuando no se los puede cambiar. */
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
      // Marca los controles para que se vean los mensajes de error.
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
