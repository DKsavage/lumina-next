-- supabase-migration.sql
-- Session Management — Phase 8
-- Appliquer dans Supabase Studio > SQL Editor

create table if not exists sessions (
  id                  uuid primary key default gen_random_uuid(),
  project             text not null,
  type                text not null default 'photo',
  date                date not null,
  address             text not null,
  access_instructions text,
  contact_name        text,
  contact_phone       text,
  prep_notes          text,
  team_json           jsonb default '{"makeup":false,"hair":false,"stylist":false,"photo":false}',
  compensation_json   jsonb default '{"type":"tfp","amount":null,"payment_method":null,"delay":null}',
  cancel_deadline_days int default 3,
  notes_internal      text,
  notes_models        text,
  moodboard_url       text,
  status              text default 'draft',
  created_at          timestamptz default now()
);

create table if not exists session_groups (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id) on delete cascade not null,
  name        text not null,
  call_time   text not null,
  duration_min int,
  look_brief  text,
  bring_items text,
  sort_order  int default 0
);

create table if not exists session_models (
  id                       uuid primary key default gen_random_uuid(),
  session_id               uuid references sessions(id) on delete cascade not null,
  model_email              text not null,
  model_prenom             text not null,
  model_langue             text default 'fr',
  group_id                 uuid references session_groups(id) on delete set null,
  token                    uuid default gen_random_uuid() unique not null,
  status                   text default 'pending',
  confirmed_at             timestamptz,
  cancelled_at             timestamptz,
  cancel_reason            text,
  question                 text,
  reminder_j5_sent_at      timestamptz,
  reminder_j2_sent_at      timestamptz,
  reminder_j1_sent_at      timestamptz,
  reminder_morning_sent_at timestamptz,
  created_at               timestamptz default now()
);

-- Indexes pour les lookups fréquents
create index if not exists session_models_token_idx      on session_models(token);
create index if not exists session_models_session_id_idx on session_models(session_id);
create index if not exists session_groups_session_id_idx on session_groups(session_id);

-- Phase 15 — Page admin /admin/factures
-- Documente aussi 3 colonnes déjà présentes en prod mais absentes de ce fichier
-- (dérive de schéma constatée : ajoutées à la main avant cette migration).
alter table session_models add column if not exists model_nom       text;
alter table session_models add column if not exists role            text;
alter table session_models add column if not exists payment_amount  numeric;

-- Nouvelles colonnes pour le suivi de facturation
alter table session_models add column if not exists invoice_status  text default 'pending';
alter table session_models add column if not exists invoice_number  text unique;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'session_models_invoice_status_check'
  ) then
    alter table session_models add constraint session_models_invoice_status_check
      check (invoice_status in ('pending', 'sent', 'paid'));
  end if;
end $$;

-- Adresse du modèle — persistée une fois, réutilisée sur toutes ses factures
alter table candidatures add column if not exists adresse text;

-- Compteur de numérotation par année civile
create table if not exists invoice_counters (
  year         int primary key,
  next_number  int not null default 1
);

alter table invoice_counters enable row level security;

create or replace function assign_invoice_number() returns trigger as $$
declare
  yr int := extract(year from now());
  n  int;
begin
  if new.payment_amount is not null and old.payment_amount is null and new.invoice_number is null then
    insert into invoice_counters (year, next_number) values (yr, 2)
      on conflict (year) do update set next_number = invoice_counters.next_number + 1
      returning next_number - 1 into n;
    new.invoice_number := 'FLW-' || yr || '-' || lpad(n::text, 4, '0');
    new.invoice_status := 'sent';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists session_models_invoice_number on session_models;
create trigger session_models_invoice_number
  before update on session_models
  for each row execute function assign_invoice_number();
