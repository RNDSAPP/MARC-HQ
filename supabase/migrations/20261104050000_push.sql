-- Notifications on the computer and the phone (Web Push). Each device Marc turns them on from
-- keeps its subscription here; when an agent waits for him, finishes, or completes a request,
-- a trigger calls the `push` function, which sends to his devices. The keys live in Vault:
-- push_vapid_public, push_vapid_private (the Web Push pair) and push_hook_key (proves a call
-- comes from the database). They are created outside this file, never written in the repo.
-- Until they exist, the trigger does nothing.

create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  device text not null default '',
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Each person sees their own devices"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Each person adds their own devices"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Each person updates their own devices"
  on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Each person removes their own devices"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- For the `push` function only (service role): the Web Push keys and the hook key
create or replace function public.push_keys()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'public', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_public'),
    'private', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_private'),
    'hook', (select decrypted_secret from vault.decrypted_secrets where name = 'push_hook_key')
  );
$$;

revoke all on function public.push_keys() from public, anon, authenticated;
grant execute on function public.push_keys() to service_role;

-- Called after an agent's status or a request changes: sends the row to the `push` function
create or replace function public.push_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hook text;
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;
  select decrypted_secret into hook from vault.decrypted_secrets where name = 'push_hook_key';
  if hook is null then
    return new;
  end if;
  perform net.http_post(
    url := 'https://gxmjgtcylwfdyyspaegt.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-key', hook),
    body := jsonb_build_object('table', tg_table_name, 'record', to_jsonb(new))
  );
  return new;
end;
$$;

revoke all on function public.push_notify() from public, anon, authenticated;

create trigger agents_push
  after insert or update of status on public.agents
  for each row when (new.status in ('wait', 'done'))
  execute function public.push_notify();

create trigger agent_requests_push
  after update of status on public.agent_requests
  for each row when (new.status = 'faite')
  execute function public.push_notify();
