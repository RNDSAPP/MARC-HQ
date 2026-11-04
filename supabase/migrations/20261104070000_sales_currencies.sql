-- Proceeds come in several currencies (EUR, USD, CAD…): kept per currency, never added together.
-- The vendor number is not a secret (useless without the API key): it sits in the tick function,
-- so the Vault reader for it goes.
alter table public.app_sales drop column proceeds, drop column currency;
alter table public.app_sales add column proceeds jsonb not null default '{}';
drop function if exists public.hq_setting(text);
