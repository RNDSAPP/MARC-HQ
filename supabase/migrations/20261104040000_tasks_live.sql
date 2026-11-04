-- Tasks ticked on the phone show up at once on the computer (and back): live changes on tasks
alter publication supabase_realtime add table public.tasks;
