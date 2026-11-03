-- Gmail boxes connected to Marc HQ, one per project and per person signed in.
-- The address is readable by its owner; the Google token never leaves the server.

create table public.mail_connections (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id text not null,
  email text not null,
  connected_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

alter table public.mail_connections enable row level security;

create policy "Each person sees their own boxes"
  on public.mail_connections for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Each person disconnects their own boxes"
  on public.mail_connections for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Google refresh tokens: row level security on and no policy at all, so only the server
-- functions (service role) can read or write them. Removed with their connection.
create table public.mail_tokens (
  user_id uuid not null,
  project_id text not null,
  refresh_token text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id),
  foreign key (user_id, project_id) references public.mail_connections (user_id, project_id) on delete cascade
);

alter table public.mail_tokens enable row level security;
revoke all on public.mail_tokens from anon, authenticated;
