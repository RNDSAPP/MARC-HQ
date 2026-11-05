-- RNDS prospecting (clubs, coaches and fighters invited to try the app), kept with the other records.
alter table public.records drop constraint records_kind_check;
alter table public.records add constraint records_kind_check check (kind in ('club', 'ambassadeur', 'bde', 'soiree', 'post', 'veille', 'modele', 'prospect'));
