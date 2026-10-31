'use client';

import { useMemo, useState } from 'react';
import type { DayAvailability } from '@/lib/services/availability-service';

interface BookingFormProps {
  days: DayAvailability[];
  barbers: string[];
  preselectedBarber?: string;
}

interface ReserveSuccess {
  formatted_date_time: string;
  google_calendar_url: string;
  email_sent: boolean;
  appointment: { barber_name: string };
}

type Status = 'idle' | 'submitting' | 'success';

const box: React.CSSProperties = {
  border: '1px solid #e4e4e7',
  borderRadius: 8,
  padding: 12,
  background: '#fff',
  // Fieldsets refuse to shrink below their content width by default,
  // which forces horizontal page scroll on phones.
  minWidth: 0,
  margin: 0,
};

const chip = (active: boolean, disabled = false): React.CSSProperties => ({
  padding: '10px 14px',
  borderRadius: 8,
  border: active ? '2px solid #18181b' : '1px solid #d4d4d8',
  background: disabled ? '#f4f4f5' : active ? '#18181b' : '#fff',
  color: disabled ? '#a1a1aa' : active ? '#fff' : '#18181b',
  fontSize: 15,
  cursor: disabled ? 'default' : 'pointer',
  whiteSpace: 'nowrap',
});

export function BookingForm({ days, barbers, preselectedBarber }: BookingFormProps) {
  const [barber, setBarber] = useState<string | undefined>(preselectedBarber);
  const [dayKey, setDayKey] = useState<string | undefined>(days[0]?.day_key);
  const [slotIso, setSlotIso] = useState<string>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>();
  const [result, setResult] = useState<ReserveSuccess>();
  // Slots taken since page load (409 responses) so we grey them out live.
  const [locallyTaken, setLocallyTaken] = useState<Record<string, string[]>>({});

  const day = useMemo(() => days.find((d) => d.day_key === dayKey), [days, dayKey]);

  function isTaken(iso: string, takenBy: string[]): boolean {
    if (!barber) return false;
    return takenBy.includes(barber) || (locallyTaken[iso] ?? []).includes(barber);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!barber || !slotIso || status === 'submitting') return;
    setStatus('submitting');
    setErrorMsg(undefined);
    try {
      const res = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: name,
          client_email: email,
          date_time: slotIso,
          barber_name: barber,
        }),
      });
      const body = (await res.json()) as ReserveSuccess & {
        error?: { code: string; message: string };
      };
      if (res.ok) {
        setResult(body);
        setStatus('success');
        return;
      }
      setStatus('idle');
      if (body.error?.code === 'SLOT_TAKEN') {
        setLocallyTaken((prev) => ({ ...prev, [slotIso]: [...(prev[slotIso] ?? []), barber] }));
        setSlotIso(undefined);
        setErrorMsg('Ese hueco se acaba de ocupar. Elige otro, por favor.');
      } else {
        setErrorMsg(body.error?.message ?? 'No se pudo completar la reserva. Inténtalo de nuevo.');
      }
    } catch {
      setStatus('idle');
      setErrorMsg('Sin conexión. Comprueba tu red e inténtalo de nuevo.');
    }
  }

  if (status === 'success' && result) {
    return (
      <section style={{ ...box, textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 40, margin: 0 }}>✂️</p>
        <h2 style={{ fontSize: 18 }}>¡Cita confirmada!</h2>
        <p style={{ fontSize: 15, lineHeight: 1.5 }}>
          {result.formatted_date_time}
          <br />
          con <strong>{result.appointment.barber_name}</strong>
        </p>
        <a
          href={result.google_calendar_url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-block',
            background: '#18181b',
            color: '#fff',
            textDecoration: 'none',
            padding: '12px 20px',
            borderRadius: 8,
            fontSize: 15,
            marginTop: 8,
          }}
        >
          Añadir a Google Calendar
        </a>
        <p style={{ fontSize: 13, color: '#71717a', marginTop: 16 }}>
          {result.email_sent
            ? 'Te hemos enviado un email con los detalles y un enlace para cancelar.'
            : 'La cita está guardada, pero no pudimos enviarte el email de confirmación.'}
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
      <fieldset style={box}>
        <legend style={{ fontSize: 14, fontWeight: 600, padding: '0 4px' }}>Barbero</legend>
        <div style={{ display: 'flex', gap: 8 }}>
          {barbers.map((b) => (
            <button
              key={b}
              type="button"
              style={chip(barber === b)}
              onClick={() => {
                setBarber(b);
                setSlotIso(undefined);
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset style={box}>
        <legend style={{ fontSize: 14, fontWeight: 600, padding: '0 4px' }}>Día</legend>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {days.map((d) => (
            <button
              key={d.day_key}
              type="button"
              style={chip(dayKey === d.day_key)}
              onClick={() => {
                setDayKey(d.day_key);
                setSlotIso(undefined);
              }}
            >
              {d.day_label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset style={box}>
        <legend style={{ fontSize: 14, fontWeight: 600, padding: '0 4px' }}>Hora</legend>
        {!barber ? (
          <p style={{ fontSize: 14, color: '#71717a', margin: 4 }}>Elige primero barbero.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
              gap: 8,
            }}
          >
            {day?.slots.map((s) => {
              const taken = isTaken(s.iso, s.taken_by);
              return (
                <button
                  key={s.iso}
                  type="button"
                  disabled={taken}
                  style={chip(slotIso === s.iso, taken)}
                  onClick={() => setSlotIso(s.iso)}
                >
                  {s.time_label}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <fieldset style={{ ...box, display: 'grid', gap: 12 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, padding: '0 4px' }}>Tus datos</legend>
        <input
          required
          minLength={2}
          maxLength={100}
          placeholder="Nombre y apellido"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #d4d4d8', fontSize: 16 }}
        />
        <input
          required
          type="email"
          placeholder="Email (para la confirmación)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #d4d4d8', fontSize: 16 }}
        />
      </fieldset>

      {errorMsg && (
        <p role="alert" style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={!barber || !slotIso || status === 'submitting'}
        style={{
          background: !barber || !slotIso ? '#a1a1aa' : '#18181b',
          color: '#fff',
          border: 0,
          borderRadius: 8,
          padding: 16,
          fontSize: 16,
          fontWeight: 600,
          cursor: !barber || !slotIso ? 'default' : 'pointer',
        }}
      >
        {status === 'submitting' ? 'Reservando…' : 'Confirmar reserva'}
      </button>
    </form>
  );
}
