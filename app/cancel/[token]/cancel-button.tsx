'use client';

import { useState } from 'react';

type State = 'idle' | 'loading' | 'done' | 'error';

export function CancelButton({ token }: { token: string }) {
  const [state, setState] = useState<State>('idle');

  async function cancel() {
    setState('loading');
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') return <p>Tu cita ha sido cancelada. El hueco queda libre.</p>;
  return (
    <>
      <button
        onClick={cancel}
        disabled={state === 'loading'}
        style={{
          background: '#dc2626',
          color: '#fff',
          border: 0,
          borderRadius: 6,
          padding: '12px 24px',
          fontSize: 15,
          cursor: 'pointer',
        }}
      >
        {state === 'loading' ? 'Cancelando…' : 'Sí, cancelar mi cita'}
      </button>
      {state === 'error' && <p>No se pudo cancelar. Inténtalo de nuevo.</p>}
    </>
  );
}
