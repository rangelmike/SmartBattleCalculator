create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  format text not null default 'vgc',
  source text not null default 'showdown',
  paste_url text,
  paste_text text not null,
  team_json jsonb not null,
  team_hash text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_member_count check (jsonb_typeof(team_json->'members') = 'array'),
  constraint teams_hash_not_empty check (length(team_hash) >= 32)
);

create table public.ai_recommendation_cache (
  id uuid primary key default gen_random_uuid(),
  format text not null default 'vgc',
  own_team_hash text not null,
  opponent_team_hash text not null,
  model text not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (format, own_team_hash, opponent_team_hash, model)
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index teams_user_id_idx on public.teams(user_id);
create index teams_team_hash_idx on public.teams(team_hash);
create index ai_recommendation_cache_lookup_idx
  on public.ai_recommendation_cache(format, own_team_hash, opponent_team_hash, model);
create index usage_events_user_created_idx on public.usage_events(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.ai_recommendation_cache enable row level security;
alter table public.usage_events enable row level security;

create policy "Profiles are visible to their owner"
on public.profiles for select
using (auth.uid() = id);

create policy "Users update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can read own teams or public teams"
on public.teams for select
using (auth.uid() = user_id or is_public);

create policy "Users insert their own teams"
on public.teams for insert
with check (auth.uid() = user_id);

create policy "Users update their own teams"
on public.teams for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users delete their own teams"
on public.teams for delete
using (auth.uid() = user_id);

create policy "Authenticated users can read recommendation cache"
on public.ai_recommendation_cache for select
to authenticated
using (true);

create policy "Authenticated users can create usage events"
on public.usage_events for insert
to authenticated
with check (auth.uid() = user_id);
