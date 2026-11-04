-- Saving a profile photo replaces the previous one (upsert): Supabase Storage then also needs the
-- right to read the person's own folder. Only their own folder: nobody can list anyone else's.
create policy "Each person reads their own photo"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
