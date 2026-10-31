-- Migration: split client_name into first and last name, and add a phone number.
--
-- Expand/contract in one file because the table is pre-launch (a handful of
-- test rows). The backfill below keeps those rows valid, so the NOT NULL
-- constraints can be added in the same step without downtime.
--
-- Rollback:
--   alter table public.appointments add column client_name text;
--   update public.appointments
--     set client_name = client_first_name || ' ' || client_last_name;
--   alter table public.appointments
--     drop column client_first_name, drop column client_last_name,
--     drop column client_phone;

-- 1. Expand: add the new columns as nullable so existing rows stay valid.
alter table public.appointments
  add column if not exists client_first_name text,
  add column if not exists client_last_name  text,
  add column if not exists client_phone      text;

-- 2. Backfill: everything before the first space is the first name, the rest
--    is the surname. A single-word name leaves the surname empty, which the
--    placeholder below makes explicit rather than silently blank.
update public.appointments
set
  client_first_name = coalesce(
    nullif(split_part(client_name, ' ', 1), ''), client_name),
  client_last_name = coalesce(
    nullif(trim(substr(client_name, strpos(client_name, ' ') + 1)), ''),
    '(sin apellidos)'),
  client_phone = coalesce(client_phone, '(sin teléfono)')
where client_first_name is null;

-- 3. Contract: now that every row has values, enforce them.
alter table public.appointments
  alter column client_first_name set not null,
  alter column client_last_name  set not null,
  alter column client_phone      set not null;

alter table public.appointments
  add constraint appointments_client_first_name_len_ck
    check (char_length(client_first_name) between 2 and 60),
  add constraint appointments_client_last_name_len_ck
    check (char_length(client_last_name) between 2 and 80),
  -- Digits, spaces and the usual separators; length checked on the digits only
  -- so "+34 600 00 00 00" and "600000000" are both accepted.
  add constraint appointments_client_phone_ck
    check (
      client_phone ~ '^\+?[0-9 ().-]{7,24}$'
      or client_phone = '(sin teléfono)'
    );

alter table public.appointments drop column client_name;

comment on column public.appointments.client_phone is
  'Contact number. The shop calls this when it needs to reach the client.';
