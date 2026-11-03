-- Google Calendar of the person signed in (one Google account each), and the calendar Marc HQ
-- created in it for each project ("RNDS", "Club 421"). Tokens and calendar ids stay on the server.

create table public.calendar_connections (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email text not null,
  connected_at timestamptz not null default now()
);

alter table public.calendar_connections enable row level security;

create policy "Each person sees their own calendar link"
  on public.calendar_connections for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Each person removes their own calendar link"
  on public.calendar_connections for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Server only: row level security on, no policy
create table public.calendar_tokens (
  user_id uuid primary key references public.calendar_connections (user_id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.calendar_tokens enable row level security;
revoke all on public.calendar_tokens from anon, authenticated;

create table public.calendar_projects (
  user_id uuid not null references public.calendar_connections (user_id) on delete cascade,
  project_id text not null,
  calendar_id text not null,
  primary key (user_id, project_id)
);

alter table public.calendar_projects enable row level security;
revoke all on public.calendar_projects from anon, authenticated;
