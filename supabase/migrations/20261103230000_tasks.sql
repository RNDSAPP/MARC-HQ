-- The To do of each project, kept in Supabase so the Mac, the phone and the site share it.
-- Each person only ever sees and changes their own tasks.

create table public.tasks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  project_id text not null,
  text text not null,
  due date,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index tasks_by_project on public.tasks (user_id, project_id);

alter table public.tasks enable row level security;

create policy "Each person reads their own tasks"
  on public.tasks for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Each person adds their own tasks"
  on public.tasks for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Each person changes their own tasks"
  on public.tasks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Each person removes their own tasks"
  on public.tasks for delete to authenticated
  using (user_id = (select auth.uid()));
