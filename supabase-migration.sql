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
