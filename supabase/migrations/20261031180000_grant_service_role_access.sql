-- Migration: grant the application role explicit access to appointments.
--
-- Supabase's "Automatically expose new tables" setting would grant this for
-- us, but it also exposes every new table to the anon and authenticated roles.
-- We keep that setting off and state the grants here instead, so the schema is
-- self-contained: a fresh database reproduces the exact same permissions
-- without depending on a dashboard checkbox.
--
-- Only service_role is granted. anon and authenticated get nothing: this app
-- has no end-user auth, and every query runs server-side through the service
-- role. Row level security stays enabled with no policies as a second barrier.
--
-- Rollback: revoke all on public.appointments from service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant select, insert, update, delete on public.appointments to service_role;
  end if;
end
$$;
