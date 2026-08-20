-- =============================================================================
-- Party Day Game Host — cloud persistence schema
--
-- Run this once in your Supabase project (SQL Editor). It creates the two
-- tables the app syncs to and locks them down with row-level security.
--
-- Security model (no login server):
--   Each row carries a secret `owner_key` derived from the user's username+PIN.
--   The client sends that key in an `x-owner-key` request header. The RLS
--   policies below only expose rows whose owner_key matches the header, so a
--   user can only read/write their own data, and the key is unguessable without
--   the PIN. This intentionally trades some rigor for zero-friction PIN auth and
--   is appropriate for low-sensitivity party data. For stricter guarantees,
--   migrate to Supabase Auth and swap the policies to use auth.uid().
-- =============================================================================

create table if not exists public.parties (
  id uuid primary key,
  owner_key text not null,
  data jsonb not null,
  updated_at bigint not null,
  deleted boolean not null default false
);

create table if not exists public.games (
  id uuid primary key,
  owner_key text not null,
  party_id uuid not null,
  data jsonb not null,
  updated_at bigint not null,
  deleted boolean not null default false
);

create index if not exists parties_owner_key_idx on public.parties (owner_key);
create index if not exists games_owner_key_idx on public.games (owner_key);
create index if not exists games_party_id_idx on public.games (party_id);

alter table public.parties enable row level security;
alter table public.games enable row level security;

-- Helper: the owner key presented by the current request.
create or replace function public.request_owner_key()
returns text
language sql
stable
as $$
  select nullif(
    current_setting('request.headers', true)::json ->> 'x-owner-key',
    ''
  );
$$;

-- Parties policies -----------------------------------------------------------
drop policy if exists parties_select on public.parties;
create policy parties_select on public.parties
  for select to anon, authenticated
  using (owner_key = public.request_owner_key());

drop policy if exists parties_insert on public.parties;
create policy parties_insert on public.parties
  for insert to anon, authenticated
  with check (owner_key = public.request_owner_key());

drop policy if exists parties_update on public.parties;
create policy parties_update on public.parties
  for update to anon, authenticated
  using (owner_key = public.request_owner_key())
  with check (owner_key = public.request_owner_key());

drop policy if exists parties_delete on public.parties;
create policy parties_delete on public.parties
  for delete to anon, authenticated
  using (owner_key = public.request_owner_key());

-- Games policies -------------------------------------------------------------
drop policy if exists games_select on public.games;
create policy games_select on public.games
  for select to anon, authenticated
  using (owner_key = public.request_owner_key());

drop policy if exists games_insert on public.games;
create policy games_insert on public.games
  for insert to anon, authenticated
  with check (owner_key = public.request_owner_key());

drop policy if exists games_update on public.games;
create policy games_update on public.games
  for update to anon, authenticated
  using (owner_key = public.request_owner_key())
  with check (owner_key = public.request_owner_key());

drop policy if exists games_delete on public.games;
create policy games_delete on public.games
  for delete to anon, authenticated
  using (owner_key = public.request_owner_key());
