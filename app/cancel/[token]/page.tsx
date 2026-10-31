import { BUSINESS_NAME } from '@/lib/config';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatForHumans } from '@/lib/time';
import { CancelButton } from './cancel-button';

export const dynamic = 'force-dynamic';

/**
 * Landing page of the email cancellation link. GET only *shows* the
 * appointment (email link scanners follow GETs); the actual cancellation is a
 * POST to /api/cancel fired by the button below.
 */
export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

  const { data: appointment } = isUuid
    ? await supabaseAdmin
        .from('appointments')
        .select('client_name, date_time, barber_name, status')
        .eq('cancel_token', token)
        .maybeSingle()
    : { data: null };

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20 }}>{BUSINESS_NAME}</h1>
      {!appointment ? (
        <p>Este enlace de cancelación no es válido.</p>
      ) : appointment.status === 'cancelled' ? (
        <p>Esta cita ya estaba cancelada. No tienes que hacer nada más.</p>
      ) : new Date(appointment.date_time).getTime() <= Date.now() ? (
        <p>Esta cita ya ha pasado y no se puede cancelar.</p>
      ) : (
        <>
          <p>
            Vas a cancelar la cita de <strong>{appointment.client_name}</strong> con{' '}
            <strong>{appointment.barber_name}</strong> el{' '}
            <strong>
              {formatForHumans(new Date(appointment.date_time), env.BUSINESS_TIMEZONE)}
            </strong>
            .
          </p>
          <CancelButton token={token} />
        </>
      )}
    </main>
  );
}
