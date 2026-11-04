-- Marc's description templates (captions for Instagram, TikTok, YouTube), kept with the other records.
alter table public.records drop constraint records_kind_check;
alter table public.records add constraint records_kind_check check (kind in ('club', 'ambassadeur', 'bde', 'soiree', 'post', 'veille', 'modele'));
