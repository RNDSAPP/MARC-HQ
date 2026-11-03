-- Marc's Claude agents, as they report themselves from Claude Code (through the `agent` function),
-- and what Marc hands them from Marc HQ ("Confier à l'agent"). Each person only sees their own.

create table public.agents (
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id text not null,
  name text not null,
  status text not null check (status in ('work', 'wait', 'done')),
  task text not null default '',
  action text not null default 'Voir',
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id, name)
);

alter table public.agents enable row level security;

create policy "Each person sees their own agents"
  on public.agents for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Each person removes their own agents"
  on public.agents for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.agent_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id text not null,
  text text not null,
  status text not null default 'ouverte' check (status in ('ouverte', 'prise', 'faite')),
  agent text,
  answer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_requests enable row level security;

create policy "Each person sees their own requests"
  on public.agent_requests for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Each person hands out their own requests"
  on public.agent_requests for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Each person removes their own requests"
  on public.agent_requests for delete to authenticated
  using (user_id = (select auth.uid()));

-- Live updates in the app when an agent reports or takes a request
alter publication supabase_realtime add table public.agents, public.agent_requests;
