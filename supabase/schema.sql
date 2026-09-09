-- kindling schema
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).

-- gen_random_uuid() lives in pgcrypto; Supabase enables it, this is a safety net.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- The live pool: messages a real person chose and sent. One-and-done.
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  body        text not null,
  mood        text,
  source      text not null default 'user',
  created_at  timestamptz not null default now(),
  consumed_at timestamptz            -- null until someone receives it
);

-- Index the "available to draw" subset so the random pick stays fast.
create index if not exists messages_unconsumed_idx
  on public.messages (created_at)
  where consumed_at is null;

-- The fallback pool: the 10 seeds plus every AI suggestion we save.
-- Never consumed, drawn at random. Covers cold start and model outages.
create table if not exists public.fallback_messages (
  id         uuid primary key default gen_random_uuid(),
  body       text not null,
  mood       text,
  origin     text not null default 'generated', -- 'seed' | 'generated'
  created_at timestamptz not null default now()
);

create index if not exists fallback_mood_idx on public.fallback_messages (mood);

-- The scale line on the sent screen.
create table if not exists public.daily_counter (
  day   date primary key default current_date,
  count integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Row level security
-- All app access goes through server routes using the service role, which
-- bypasses RLS. Enabling RLS with no permissive policies means the anon and
-- authenticated keys can read/write nothing. Defense in depth.
-- ---------------------------------------------------------------------------
alter table public.messages          enable row level security;
alter table public.fallback_messages enable row level security;
alter table public.daily_counter     enable row level security;

-- ---------------------------------------------------------------------------
-- claim_live_message()
-- Atomically pick one unconsumed live message and mark it consumed in a
-- single statement, so two simultaneous opens can never draw the same one.
-- FOR UPDATE SKIP LOCKED lets concurrent callers grab different rows.
-- Returns zero rows when the live pool is empty (caller then uses fallback).
-- ---------------------------------------------------------------------------
create or replace function public.claim_live_message()
returns table (body text, mood text)
language sql
security definer
set search_path = public
as $$
  update public.messages m
  set consumed_at = now()
  where m.id = (
    select id from public.messages
    where consumed_at is null
    order by random()
    limit 1
    for update skip locked
  )
  returning m.body, m.mood;
$$;

-- ---------------------------------------------------------------------------
-- increment_daily_counter()
-- Bump today's count by one and return the new value.
-- ---------------------------------------------------------------------------
create or replace function public.increment_daily_counter()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.daily_counter (day, count)
  values (current_date, 1)
  on conflict (day) do update set count = public.daily_counter.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed: the 10 base messages. Guaranteed floor so the pool is never empty.
-- Idempotent-ish: only inserts seeds if none exist yet.
-- ---------------------------------------------------------------------------
insert into public.fallback_messages (body, mood, origin)
select * from (values
  ('Whatever today asked of you, it was enough. You can rest now.', 'comfort', 'seed'),
  ('You don''t have to hold it all at once. Set one thing down for a while.', 'comfort', 'seed'),
  ('Be as gentle with yourself as you''d be with a friend right now.', 'comfort', 'seed'),
  ('The next right step is small. You only need that one.', 'steady', 'seed'),
  ('Slow is still forward. Keep your pace.', 'steady', 'seed'),
  ('You''ve made it through every worst day so far. Good odds for this one.', 'cheerup', 'seed'),
  ('Small good things still find tired people. One''s on its way to you.', 'cheerup', 'seed'),
  ('You did a hard thing recently. That deserves more than a quick nod.', 'celebrate', 'seed'),
  ('Hello from someone you''ll never meet. Hope today''s kind to you.', 'hi', 'seed'),
  ('A stranger thought of you for a second today. That''s all. Take care.', 'hi', 'seed')
) as seeds(body, mood, origin)
where not exists (select 1 from public.fallback_messages where origin = 'seed');
