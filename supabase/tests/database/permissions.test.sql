-- Disposable local database only. Fixtures and mutations are rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(24);

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-4000-8000-000000000001', 'miguel20052002@gmail.com', now()),
  ('00000000-0000-4000-8000-000000000002', 'harness-user@example.invalid', now());

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select ok(public.is_popular_team_admin(), 'Confirmed designated account is admin');
select lives_ok($$
  insert into public.popular_teams (id, created_by, name, source, paste_text, team_json, team_hash, species_names)
  values ('10000000-0000-4000-8000-000000000001', auth.uid(), 'Harness rain', 'Harness', '',
    '{"members":[{"species":"Pelipper","moves":["Hurricane"],"item":"Sitrus Berry","ability":"Drizzle","evs":{},"nature":"Modest"}]}',
    repeat('a',32), array['Pelipper']);
$$, 'Admin can insert a Popular team');
select is((select sample_size from public.popular_pokemon_common_sets where species = 'Pelipper'), 1, 'Insert trigger creates a common set');
select is((select ability from public.popular_pokemon_common_sets where species = 'Pelipper'), 'Drizzle', 'Common set retains ability');

insert into public.popular_teams (id, created_by, name, source, paste_text, team_json, team_hash, species_names)
values ('10000000-0000-4000-8000-000000000002', auth.uid(), 'Harness unrelated', 'Harness', '',
  '{"members":[{"species":"Pikachu","moves":["Thunderbolt"],"item":"Light Ball","ability":"Static","evs":{},"nature":"Timid"}]}',
  repeat('b',32), array['Pikachu']);
reset role;
-- A sentinel detects unnecessary refreshes despite transaction-stable now().
update public.popular_pokemon_common_sets set updated_at = '2000-01-01T00:00:00Z' where species = 'Pikachu';

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select ok(not public.is_popular_team_admin(), 'Regular account is not admin');
select is((select count(*) from public.popular_teams where source = 'Harness'), 2::bigint, 'Regular account can read Popular teams');
select is((select count(*) from public.search_popular_teams('Harness rain', array['Pelipper'], 21, 0)), 1::bigint, 'Search RPC obeys text and species filters');
select throws_ok($$
  insert into public.popular_teams (created_by, name, source, paste_text, team_json, team_hash, species_names)
  values (auth.uid(), 'Denied', 'Harness', '', '{"members":[]}', repeat('c',32), array['Pelipper']);
$$, '42501', null, 'Regular account cannot insert Popular teams');
select results_eq($$update public.popular_teams set name = 'Denied' where source = 'Harness' returning id$$, array[]::uuid[], 'Regular account cannot update Popular teams');
select results_eq($$delete from public.popular_teams where source = 'Harness' returning id$$, array[]::uuid[], 'Regular account cannot delete Popular teams');
select throws_ok($$update public.popular_pokemon_common_sets set ability = 'Denied' where species = 'Pelipper'$$, '42501', null, 'Common sets are not client-writable');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select throws_ok($$
  insert into public.popular_teams (created_by, name, source, paste_text, team_json, team_hash, species_names)
  values ('00000000-0000-4000-8000-000000000002', 'Wrong owner', 'Harness', '', '{"members":[]}', repeat('d',32), array['Pelipper']);
$$, '42501', null, 'Admin cannot insert on behalf of a different creator');
select lives_ok($$
  update public.popular_teams
  set team_json = '{"members":[{"species":"Archaludon","moves":["Electro Shot"],"item":"Leftovers","ability":"Stamina","evs":{},"nature":"Modest"}]}',
      species_names = array['Archaludon']
  where id = '10000000-0000-4000-8000-000000000001';
$$, 'Admin can update a team');
select is((select count(*) from public.popular_pokemon_common_sets where species = 'Pelipper'), 0::bigint, 'Update removes the old species common set');
select is((select ability from public.popular_pokemon_common_sets where species = 'Archaludon'), 'Stamina', 'Update refreshes the new species');
select is((select updated_at from public.popular_pokemon_common_sets where species = 'Pikachu'), '2000-01-01T00:00:00Z'::timestamptz, 'Unrelated species is not refreshed');
select lives_ok($$delete from public.popular_teams where id = '10000000-0000-4000-8000-000000000001'$$, 'Admin can delete a team');
select is((select count(*) from public.popular_pokemon_common_sets where species = 'Archaludon'), 0::bigint, 'Delete removes an unused common set');

reset role;
update auth.users set email_confirmed_at = null where id = '00000000-0000-4000-8000-000000000001';
set local role authenticated;
select ok(not public.is_popular_team_admin(), 'Unconfirmed designated account is not admin');
select results_eq($$delete from public.popular_teams where source = 'Harness' returning id$$, array[]::uuid[], 'Unconfirmed designated account cannot delete');

reset role;
set local role anon;
set local request.jwt.claim.sub = '';
select throws_ok($$select * from public.popular_teams$$, '42501', null, 'Anonymous clients cannot read Popular teams');
select throws_ok($$select * from public.popular_pokemon_common_sets$$, '42501', null, 'Anonymous clients cannot read common sets');
select throws_ok($$select public.is_popular_team_admin()$$, '42501', null, 'Anonymous clients cannot call admin RPC');
select throws_ok($$select * from public.search_popular_teams()$$, '42501', null, 'Anonymous clients cannot call search RPC');
reset role;

select * from finish();
rollback;
