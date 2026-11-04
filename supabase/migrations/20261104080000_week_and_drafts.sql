-- When a task was ticked (for the Monday summary), and which App Store review a request to the
-- agents is about (the agent's answer is then a draft reply, sent in one tap from the app).

alter table public.tasks add column done_at timestamptz;
update public.tasks set done_at = created_at where done and done_at is null;

create or replace function public.tasks_done_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.done and (tg_op = 'INSERT' or not old.done) then
    new.done_at := now();
  elsif not new.done then
    new.done_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_done_at
  before insert or update of done on public.tasks
  for each row execute function public.tasks_done_at();

alter table public.agent_requests add column review_id text;
