-- What Marc keeps in his tools (notes, ideas, versions, feedback, goals, links, the services'
-- addresses, the details of each card, the projects he added), shared by his phone and his
-- computer: one row per list, its content in `value`. Each person only sees and changes their own.
create table public.user_store (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_store enable row level security;

create policy "Each person reads their own store" on public.user_store for select to authenticated using (user_id = (select auth.uid()));
create policy "Each person adds to their own store" on public.user_store for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Each person changes their own store" on public.user_store for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Each person removes from their own store" on public.user_store for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.user_store to authenticated;

-- Live: a note written on the phone shows on the computer
alter publication supabase_realtime add table public.user_store;
