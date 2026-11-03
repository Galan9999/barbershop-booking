-- Migration: appointments get a service, its price and an end time, so a
-- booking can last longer than one slot (haircut + beard takes an hour, either
-- alone half). The price is stored as charged at booking time, so a later price
-- change never rewrites what a client was told.
--
-- With variable durations, "same start" is no longer the only clash: a 10:00
-- one-hour booking must also block a 10:30 one. The unique index cannot see
-- that, so an exclusion constraint over the time range becomes the guard. The
-- unique index stays: it still names the exact-same-slot case, which the
-- idempotent retry path looks up by start time.
--
-- Rollback:
--   alter table public.appointments
--     drop constraint appointments_no_overlap_ex,
--     drop constraint appointments_ends_after_start_ck,
--     drop constraint appointments_service_name_len_ck,
--     drop constraint appointments_price_nonnegative_ck,
--     drop column price,
--     drop column ends_at,
--     drop column service_name;
--   drop trigger if exists appointments_fill_ends_at_tg on public.appointments;
--   drop function if exists public.appointments_fill_ends_at();
--   drop extension if exists btree_gist;  -- only if nothing else uses it

-- Needed to mix equality on text (barber) with range overlap in one GiST index.
create extension if not exists btree_gist;

-- 1. Expand: nullable, so existing rows stay valid.
alter table public.appointments
  add column if not exists service_name text,
  add column if not exists price        numeric(8, 2),
  add column if not exists ends_at      timestamptz;

-- 2. Backfill: every booking so far was a single 30-minute haircut.
update public.appointments
set
  service_name = coalesce(service_name, 'Corte de pelo'),
  price        = coalesce(price, 15),
  ends_at      = coalesce(ends_at, date_time + interval '30 minutes')
where service_name is null or price is null or ends_at is null;

-- Transitional: the code deployed before this migration inserts neither
-- column. The default and the trigger keep those inserts valid in the window
-- between migrating and deploying. Drop both in a later migration:
--   alter table public.appointments alter column service_name drop default;
--   alter table public.appointments alter column price drop default;
--   drop trigger appointments_fill_ends_at_tg on public.appointments;
--   drop function public.appointments_fill_ends_at();
alter table public.appointments
  alter column service_name set default 'Corte de pelo',
  alter column price        set default 15;

create or replace function public.appointments_fill_ends_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ends_at is null then
    new.ends_at := new.date_time + interval '30 minutes';
  end if;
  return new;
end;
$$;

create trigger appointments_fill_ends_at_tg
  before insert on public.appointments
  for each row execute function public.appointments_fill_ends_at();

-- 3. Contract.
alter table public.appointments
  alter column service_name set not null,
  alter column price        set not null,
  alter column ends_at      set not null;

alter table public.appointments
  add constraint appointments_service_name_len_ck
    check (char_length(service_name) between 2 and 60),
  add constraint appointments_price_nonnegative_ck
    check (price >= 0),
  add constraint appointments_ends_after_start_ck
    check (ends_at > date_time);

-- THE concurrency guard for variable durations: two confirmed bookings of the
-- same barber can never overlap in time, however close together the inserts
-- arrive. Half-open ranges, so 10:00-10:30 and 10:30-11:00 do not clash.
-- Violations raise SQLSTATE 23P01. Cancelled rows are outside the predicate,
-- so cancelling frees the time.
alter table public.appointments
  add constraint appointments_no_overlap_ex
  exclude using gist (
    barber_name with =,
    tstzrange(date_time, ends_at, '[)') with &&
  )
  where (status = 'confirmed');

comment on column public.appointments.service_name is
  'What was booked, as shown to the client at booking time (e.g. "Corte y barba").';
comment on column public.appointments.price is
  'Euros, as quoted at booking time. Paid at the shop.';
comment on column public.appointments.ends_at is
  'Appointment end, UTC. date_time plus the service duration.';
comment on table public.appointments is
  'Barbershop bookings. Overlaps are prevented ONLY by appointments_no_overlap_ex '
  '(and exact same-slot by appointments_active_slot_uq).';
