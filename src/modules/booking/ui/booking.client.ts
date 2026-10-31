import type { BookingConfirmationDto } from '@/modules/booking/application/dto/booking.dto';

/**
 * Browser-side access to the booking API. Keeping fetch here means the hook
 * deals with results, never with transport details or response parsing.
 */

export interface ReserveRequest {
  client_name: string;
  client_email: string;
  date_time: string;
  barber_name: string;
}

export type ReserveResult =
  | { ok: true; confirmation: BookingConfirmationDto }
  | { ok: false; code: string; message: string };

const NETWORK_ERROR_MESSAGE = 'Sin conexión. Comprueba tu red e inténtalo de nuevo.';
const GENERIC_ERROR_MESSAGE = 'No se pudo completar la reserva. Inténtalo de nuevo.';

export async function reserveBooking(request: ReserveRequest): Promise<ReserveResult> {
  try {
    const response = await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const body = (await response.json()) as BookingConfirmationDto & {
      error?: { code: string; message: string };
    };

    if (response.ok) return { ok: true, confirmation: body };
    return {
      ok: false,
      code: body.error?.code ?? 'UNKNOWN',
      message: body.error?.message ?? GENERIC_ERROR_MESSAGE,
    };
  } catch {
    return { ok: false, code: 'NETWORK', message: NETWORK_ERROR_MESSAGE };
  }
}

export async function cancelBookingByToken(
  token: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (response.ok) return { ok: true };
    const body = (await response.json()) as { error?: { message: string } };
    return { ok: false, message: body.error?.message };
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE };
  }
}
