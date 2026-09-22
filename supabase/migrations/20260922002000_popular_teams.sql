create table public.popular_teams (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  name text not null check (length(btrim(name)) between 1 and 120),
  source text not null check (length(btrim(source)) between 1 and 120),
  format text not null default 'champions',
  paste_url text,
  paste_text text not null,
  team_json jsonb not null check (jsonb_typeof(team_json->'members') = 'array'),
  team_hash text not null unique check (length(team_hash) >= 32),
  species_names text[] not null check (cardinality(species_names) between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index popular_teams_updated_idx on public.popular_teams(updated_at desc, id desc);

create trigger popular_teams_set_updated_at
before update on public.popular_teams
for each row execute function public.set_updated_at();

create function public.is_popular_team_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as account
    where account.id = (select auth.uid())
      and lower(account.email) = 'miguel20052002@gmail.com'
      and account.email_confirmed_at is not null
  );
$$;

revoke execute on function public.is_popular_team_admin() from public, anon;
grant execute on function public.is_popular_team_admin() to authenticated;

alter table public.popular_teams enable row level security;
grant select, insert, update, delete on public.popular_teams to authenticated;
revoke all on public.popular_teams from anon;

create policy "Signed-in users read popular teams"
on public.popular_teams for select to authenticated
using (true);

create policy "Verified owner inserts popular teams"
on public.popular_teams for insert to authenticated
with check ((select public.is_popular_team_admin()) and created_by = (select auth.uid()));

create policy "Verified owner updates popular teams"
on public.popular_teams for update to authenticated
using ((select public.is_popular_team_admin()) and created_by = (select auth.uid()))
with check ((select public.is_popular_team_admin()) and created_by = (select auth.uid()));

create policy "Verified owner deletes popular teams"
on public.popular_teams for delete to authenticated
using ((select public.is_popular_team_admin()) and created_by = (select auth.uid()));

create function public.search_popular_teams(
  p_text text default '',
  p_pokemon text[] default '{}',
  p_limit integer default 21,
  p_offset integer default 0
)
returns setof public.popular_teams
language sql
stable
security invoker
set search_path = ''
as $$
  select team.*
  from public.popular_teams as team
  where (
    btrim(coalesce(p_text, '')) = ''
    or position(lower(btrim(p_text)) in lower(team.name)) > 0
    or position(lower(btrim(p_text)) in lower(team.source)) > 0
  )
    and not exists (
      select 1
      from unnest(coalesce(p_pokemon, '{}'::text[])) as term(value)
      where btrim(term.value) <> ''
        and not exists (
          select 1
          from unnest(team.species_names) as species(name)
          where position(lower(btrim(term.value)) in lower(species.name)) > 0
        )
    )
  order by team.updated_at desc, team.id desc
  limit least(greatest(coalesce(p_limit, 21), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.search_popular_teams(text, text[], integer, integer) from public, anon;
grant execute on function public.search_popular_teams(text, text[], integer, integer) to authenticated;

create function public.suggest_popular_teams(
  p_kind text,
  p_prefix text,
  p_excluded text[] default '{}'
)
returns table(name text, team_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with candidates as (
    select team.id, team.source as value
    from public.popular_teams as team
    where p_kind = 'source'
    union all
    select team.id, species.value
    from public.popular_teams as team
    cross join lateral unnest(team.species_names) as species(value)
    where p_kind = 'pokemon'
  )
  select min(candidate.value) as name, count(distinct candidate.id) as team_count
  from candidates as candidate
  where btrim(coalesce(p_prefix, '')) <> ''
    and left(lower(candidate.value), length(lower(btrim(p_prefix)))) = lower(btrim(p_prefix))
    and lower(candidate.value) <> lower(btrim(p_prefix))
    and not exists (
      select 1
      from unnest(coalesce(p_excluded, '{}'::text[])) as excluded(value)
      where lower(btrim(excluded.value)) = lower(candidate.value)
    )
  group by lower(candidate.value)
  order by count(distinct candidate.id) desc, min(candidate.value)
  limit 6;
$$;

revoke execute on function public.suggest_popular_teams(text, text, text[]) from public, anon;
grant execute on function public.suggest_popular_teams(text, text, text[]) to authenticated;
