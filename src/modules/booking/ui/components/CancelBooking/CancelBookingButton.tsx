'use client';

import { useState } from 'react';
import { cancelBookingByToken } from '@/modules/booking/ui/booking.client';
import { Button } from '@/shared/ui/components/Button/Button';
import { Callout } from '@/shared/ui/components/Callout/Callout';
import styles from './CancelBooking.module.css';

type CancelStatus = 'idle' | 'submitting' | 'cancelled' | 'failed';

/** The cancellation itself is a POST: GET must never mutate (email prefetch). */
export function CancelBookingButton({ token }: { token: string }) {
  const [status, setStatus] = useState<CancelStatus>('idle');
  const [message, setMessage] = useState<string>();

  async function handleCancel() {
    setStatus('submitting');
    const result = await cancelBookingByToken(token);
    if (result.ok) {
      setStatus('cancelled');
      return;
    }
    setStatus('failed');
    setMessage(result.message ?? 'No se pudo cancelar. Inténtalo de nuevo.');
  }

  if (status === 'cancelled') {
    return (
      <p className={styles.done} role="status">
        Tu cita ha sido cancelada. El hueco queda libre para otra persona.
      </p>
    );
  }

  return (
    <div className={styles.actions}>
      <Button
        type="button"
        variant="danger"
        size="lg"
        fullWidth
        disabled={status === 'submitting'}
        onClick={() => void handleCancel()}
      >
        {status === 'submitting' ? 'Cancelando…' : 'Sí, cancelar mi cita'}
      </Button>
      {status === 'failed' && message && <Callout tone="danger">{message}</Callout>}
    </div>
  );
}
