create index popular_teams_species_names_idx
on public.popular_teams using gin (species_names);

create table public.popular_pokemon_common_sets (
  species text primary key,
  sample_size integer not null check (sample_size > 0),
  moves text[] not null check (cardinality(moves) between 1 and 4),
  item text not null,
  ability text not null,
  evs jsonb not null check (jsonb_typeof(evs) = 'object'),
  nature text not null,
  updated_at timestamptz not null default now()
);

alter table public.popular_pokemon_common_sets enable row level security;
revoke all on public.popular_pokemon_common_sets from public, anon;
grant select on public.popular_pokemon_common_sets to authenticated;

create policy "Signed-in users read popular Pokemon common sets"
on public.popular_pokemon_common_sets for select to authenticated
using (true);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.refresh_popular_pokemon_common_set(p_species text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_species, 0));

  with appearances as materialized (
    select
      member.value as pokemon,
      pg_catalog.jsonb_build_object(
        'hp', coalesce((member.value->'evs'->>'hp')::integer, 0),
        'atk', coalesce((member.value->'evs'->>'atk')::integer, 0),
        'def', coalesce((member.value->'evs'->>'def')::integer, 0),
        'spa', coalesce((member.value->'evs'->>'spa')::integer, 0),
        'spd', coalesce((member.value->'evs'->>'spd')::integer, 0),
        'spe', coalesce((member.value->'evs'->>'spe')::integer, 0)
      ) as evs
    from public.popular_teams as team
    cross join lateral pg_catalog.jsonb_array_elements(team.team_json->'members') as member(value)
    where team.species_names @> array[p_species]
      and member.value->>'species' = p_species
  ),
  ranked_moves as (
    select min(move.value) as name, count(*) as uses
    from appearances as appearance
    cross join lateral pg_catalog.jsonb_array_elements_text(appearance.pokemon->'moves') as move(value)
    group by lower(move.value)
    order by uses desc, lower(move.value)
    limit 4
  )
  insert into public.popular_pokemon_common_sets (
    species, sample_size, moves, item, ability, evs, nature, updated_at
  )
  select
    p_species,
    (select count(*)::integer from appearances),
    (select array_agg(name order by uses desc, lower(name)) from ranked_moves),
    (select min(pokemon->>'item') from appearances group by lower(pokemon->>'item') order by count(*) desc, lower(pokemon->>'item') limit 1),
    (select min(pokemon->>'ability') from appearances group by lower(pokemon->>'ability') order by count(*) desc, lower(pokemon->>'ability') limit 1),
    (select evs from appearances group by evs order by count(*) desc, evs::text limit 1),
    (select min(coalesce(pokemon->>'nature', 'Serious')) from appearances group by lower(coalesce(pokemon->>'nature', 'Serious')) order by count(*) desc, lower(coalesce(pokemon->>'nature', 'Serious')) limit 1),
    now()
  where exists (select 1 from appearances)
  on conflict (species) do update set
    sample_size = excluded.sample_size,
    moves = excluded.moves,
    item = excluded.item,
    ability = excluded.ability,
    evs = excluded.evs,
    nature = excluded.nature,
    updated_at = excluded.updated_at;

  if not found then
    delete from public.popular_pokemon_common_sets where species = p_species;
  end if;
end;
$$;

create function private.sync_popular_pokemon_common_sets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_species text[];
  current_species text;
begin
  if tg_op = 'INSERT' then
    affected_species := new.species_names;
  elsif tg_op = 'DELETE' then
    affected_species := old.species_names;
  else
    if old.team_json = new.team_json and old.species_names = new.species_names then
      return null;
    end if;
    affected_species := old.species_names || new.species_names;
  end if;

  for current_species in
    select distinct name from pg_catalog.unnest(affected_species) as species(name)
    order by name
  loop
    perform private.refresh_popular_pokemon_common_set(current_species);
  end loop;

  return null;
end;
$$;

revoke execute on function private.refresh_popular_pokemon_common_set(text) from public, anon, authenticated;
revoke execute on function private.sync_popular_pokemon_common_sets() from public, anon, authenticated;

create trigger popular_teams_sync_common_sets
after insert or update or delete on public.popular_teams
for each row execute function private.sync_popular_pokemon_common_sets();

select private.refresh_popular_pokemon_common_set(species)
from (
  select distinct pg_catalog.unnest(species_names) as species
  from public.popular_teams
) as existing_species;
