-- What Marc adds in Marc HQ: clubs, ambassadors, student unions (BDE), soirées and posts. One row
-- per item, its fields in `data`; each person only sees and changes their own.

create table public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  project_id text not null,
  kind text not null check (kind in ('club', 'ambassadeur', 'bde', 'soiree', 'post')),
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index records_by_project on public.records (user_id, project_id, kind);

alter table public.records enable row level security;

create policy "Each person reads their own records" on public.records for select to authenticated using (user_id = (select auth.uid()));
create policy "Each person adds their own records" on public.records for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Each person changes their own records" on public.records for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Each person removes their own records" on public.records for delete to authenticated using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.records;
