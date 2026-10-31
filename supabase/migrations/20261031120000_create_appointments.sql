-- Migration: create appointments table for barbershop booking.
-- Rollback: drop table public.appointments;

create table public.appointments (
  id            uuid primary key default gen_random_uuid(),
  client_name   text not null
                constraint appointments_client_name_len_ck
                check (char_length(client_name) between 2 and 100),
  client_email  text not null
                constraint appointments_client_email_ck
                check (client_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  date_time     timestamptz not null,          -- slot start, stored in UTC
  barber_name   text not null,
  status        text not null default 'confirmed'
                constraint appointments_status_ck
                check (status in ('confirmed', 'cancelled')),
  cancel_token  uuid not null default gen_random_uuid()
                constraint appointments_cancel_token_uq unique,
  created_at    timestamptz not null default now(),
  cancelled_at  timestamptz,
  constraint appointments_cancelled_consistency_ck
    check ((status = 'cancelled') = (cancelled_at is not null))
);

comment on table public.appointments is
  'Barbershop bookings. Slot uniqueness is enforced ONLY by appointments_active_slot_uq.';
comment on column public.appointments.cancel_token is
  'Secret capability token sent by email. Never expose it in reserve API responses or logs.';

-- THE concurrency guard: two simultaneous inserts for the same barber+slot cannot
-- both commit. Cancelled rows leave the partial index, so cancelling frees the slot.
create unique index appointments_active_slot_uq
  on public.appointments (barber_name, date_time)
  where status = 'confirmed';

-- Token lookups are covered by the unique constraint on cancel_token.

-- Lock the table down: RLS on, zero policies. The anon/authenticated keys can do
-- nothing; all access goes through the service role on the server.
alter table public.appointments enable row level security;
