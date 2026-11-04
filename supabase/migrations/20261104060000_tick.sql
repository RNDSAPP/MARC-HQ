-- Marc HQ's hourly round (the `tick` function): morning tasks, tomorrow's soirées, new App Store
-- reviews, the apps' downloads and revenue. pg_cron calls it every hour through push_tick().

create extension if not exists pg_cron with schema pg_catalog;

-- What was already sent (or learnt), so nothing is sent twice. Service role only.
create table public.push_log (
  key text primary key,
  created_at timestamptz not null default now()
);

alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;

-- Each app's day from Apple's sales reports (first downloads, in-app purchases, proceeds)
create table public.app_sales (
  project_id text not null,
  day date not null,
  downloads integer not null default 0,
  purchases integer not null default 0,
  proceeds numeric(12, 2) not null default 0,
  currency text not null default 'EUR',
  primary key (project_id, day)
);

alter table public.app_sales enable row level security;
revoke all on public.app_sales from anon, authenticated;

-- Settings kept in Vault that the functions may read (service role only); only names listed here
create or replace function public.hq_setting(setting text)
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = setting and setting in ('asc_vendor_number');
$$;

revoke all on function public.hq_setting(text) from public, anon, authenticated;
grant execute on function public.hq_setting(text) to service_role;

-- Calls the `tick` function with the hook key
create or replace function public.push_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hook text;
begin
  select decrypted_secret into hook from vault.decrypted_secrets where name = 'push_hook_key';
  if hook is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://gxmjgtcylwfdyyspaegt.supabase.co/functions/v1/tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-key', hook),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

revoke all on function public.push_tick() from public, anon, authenticated;

select cron.schedule('marc-hq-tick', '5 * * * *', 'select public.push_tick()');
