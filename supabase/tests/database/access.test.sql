begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Fixture setup alone uses postgres. Every access assertion uses anon/authenticated.
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001', 'a@verification.invalid', now(), '{"username":"verify-a"}'),
  ('00000000-0000-4000-8000-000000000002', 'b@verification.invalid', now(), '{"username":"verify-b"}'),
  ('00000000-0000-4000-8000-000000000003', 'miguel20052002@gmail.com', null, '{"username":"verify-admin"}');

create temp table fixture (team jsonb);
insert into fixture values ('{"format":"champions","members":[{"name":"Grimmsnarl","species":"Grimmsnarl","item":"Light Clay","ability":"Prankster","level":50,"nature":"Calm","evs":{"hp":32,"def":20,"spd":14},"ivs":{},"moves":["Foul Play","Reflect","Light Screen","Parting Shot"]}]}');
grant select on fixture to authenticated;

insert into public.teams (id, user_id, name, paste_text, team_json, team_hash, is_public)
select id::uuid, owner::uuid, name, '', fixture.team, repeat(hash, 64), visible
from fixture cross join (values
  ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','A team','a',false),
  ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','B private','b',false),
  ('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000002','B public','c',true)
) as seed(id, owner, name, hash, visible);
insert into public.team_collections (user_id, team_id, list_kind) values
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','own'),
  ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000012','own');
select is((select count(*) from public.profiles), 3::bigint, 'Auth trigger creates profiles');

set local role anon;
select is((select count(*) from public.teams), 1::bigint, 'Anonymous reads only explicitly public teams');
select is((select count(*) from public.profiles), 0::bigint, 'Anonymous cannot read profiles');
select is((select count(*) from public.team_collections), 0::bigint, 'Anonymous cannot read collections');
select throws_ok('select * from public.popular_teams', '42501', null, 'Anonymous cannot read Popular');
select throws_ok('select * from public.popular_pokemon_common_sets', '42501', null, 'Anonymous cannot read common sets');
select throws_ok('select * from public.search_popular_teams()', '42501', null, 'Anonymous cannot call Popular search');
select throws_ok($$insert into public.teams(user_id,name,paste_text,team_json,team_hash) values ('00000000-0000-4000-8000-000000000001','anonymous','','{"members":[]}',repeat('x',64))$$, '42501', null, 'Anonymous cannot create a personal team');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*) from public.teams), 2::bigint, 'A reads own and public teams');
select is((select count(*) from public.teams where name='B private'), 0::bigint, 'A cannot read B private team');
select is((select count(*) from public.profiles), 1::bigint, 'A reads only own profile');
select lives_ok($$update public.profiles set username='verify-a-edited' where id=auth.uid()$$, 'A updates own profile');
select is((select username from public.profiles where id=auth.uid()), 'verify-a-edited', 'Profile edit persists');
with changed as (update public.profiles set username='stolen' where id='00000000-0000-4000-8000-000000000002' returning id)
select is((select count(*) from changed), 0::bigint, 'A cannot update B profile');
select throws_ok($$insert into public.teams(user_id,name,paste_text,team_json,team_hash) select '00000000-0000-4000-8000-000000000002','forged','',team,repeat('d',64) from fixture$$, '42501', null, 'A cannot insert for B');
select lives_ok($$insert into public.teams(id,user_id,name,paste_text,team_json,team_hash) select '00000000-0000-4000-8000-000000000014',auth.uid(),'A created','',team,repeat('d',64) from fixture$$, 'A inserts own team');
select lives_ok($$update public.teams set name='A edited' where id='00000000-0000-4000-8000-000000000014'$$, 'A edits own team');
select is((select name from public.teams where id='00000000-0000-4000-8000-000000000014'), 'A edited', 'Team edit persists');
select throws_ok($$update public.teams set user_id='00000000-0000-4000-8000-000000000002' where id='00000000-0000-4000-8000-000000000014'$$, '42501', null, 'A cannot transfer ownership to B');
with changed as (update public.teams set name='stolen' where user_id='00000000-0000-4000-8000-000000000002' returning id)
select is((select count(*) from changed), 0::bigint, 'A cannot edit B private or public teams');
with changed as (delete from public.teams where user_id='00000000-0000-4000-8000-000000000002' returning id)
select is((select count(*) from changed), 0::bigint, 'A cannot delete B teams');
select is((select count(*) from public.team_collections), 1::bigint, 'A reads only own collections');
select throws_ok($$insert into public.team_collections values ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000011','opponent',now())$$, '42501', null, 'A cannot insert B membership');
select lives_ok($$insert into public.team_collections(user_id,team_id,list_kind) values (auth.uid(),'00000000-0000-4000-8000-000000000014','own'),(auth.uid(),'00000000-0000-4000-8000-000000000014','opponent')$$, 'A writes both team memberships');
with changed as (delete from public.team_collections where user_id='00000000-0000-4000-8000-000000000002' returning team_id)
select is((select count(*) from changed), 0::bigint, 'A cannot delete B membership');
select lives_ok($$delete from public.teams where id='00000000-0000-4000-8000-000000000014'$$, 'A deletes own team');
select is((select count(*) from public.team_collections where team_id='00000000-0000-4000-8000-000000000014'), 0::bigint, 'Team deletion cascades to both memberships');
select ok(not public.is_popular_team_admin(), 'Regular user is not Popular admin');
select throws_ok($$insert into public.popular_teams(created_by,name,source,paste_text,team_json,team_hash,species_names) select auth.uid(),'forged','verification','',team,repeat('p',64),array['Grimmsnarl'] from fixture$$, '42501', null, 'Regular user cannot insert Popular');
select throws_ok($$insert into public.popular_pokemon_common_sets(species,sample_size,moves,item,ability,evs,nature) values ('Grimmsnarl',1,array['Protect'],'Light Clay','Prankster','{}','Calm')$$, '42501', null, 'Clients cannot forge common sets');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated","email":"miguel20052002@gmail.com"}';
select ok(not public.is_popular_team_admin(), 'Matching email without confirmation is not admin');
select throws_ok($$insert into public.popular_teams(created_by,name,source,paste_text,team_json,team_hash,species_names) select auth.uid(),'unconfirmed','verification','',team,repeat('p',64),array['Grimmsnarl'] from fixture$$, '42501', null, 'Unconfirmed account cannot write Popular');
reset role;
update auth.users set email_confirmed_at=now() where id='00000000-0000-4000-8000-000000000003';
set local role authenticated;
select ok(public.is_popular_team_admin(), 'Confirmed designated account is admin');
select throws_ok($$insert into public.popular_teams(created_by,name,source,paste_text,team_json,team_hash,species_names) select '00000000-0000-4000-8000-000000000001','wrong owner','verification','',team,repeat('p',64),array['Grimmsnarl'] from fixture$$, '42501', null, 'Admin must use own created_by');
select lives_ok($$insert into public.popular_teams(id,created_by,name,source,paste_text,team_json,team_hash,species_names) select '00000000-0000-4000-8000-000000000021',auth.uid(),'Popular fixture','verification','',team,repeat('p',64),array['Grimmsnarl'] from fixture$$, 'Admin inserts Popular');
select is((select sample_size from public.popular_pokemon_common_sets where species='Grimmsnarl'), 1, 'Insert trigger creates common-set sample');
select is((select item from public.popular_pokemon_common_sets where species='Grimmsnarl'), 'Light Clay', 'Common set reflects fixture item');
select lives_ok($$update public.popular_teams set team_json=jsonb_set(team_json,'{members,0,item}','"Leftovers"') where id='00000000-0000-4000-8000-000000000021'$$, 'Admin edits Popular');
select is((select item from public.popular_pokemon_common_sets where species='Grimmsnarl'), 'Leftovers', 'Update trigger refreshes common set');
select lives_ok($$insert into public.popular_teams(id,created_by,name,source,paste_text,team_json,team_hash,species_names) select '00000000-0000-4000-8000-000000000022',auth.uid(),'Second fixture','verification','',team,repeat('q',64),array['Grimmsnarl'] from fixture$$, 'Admin inserts another sample');
select is((select sample_size from public.popular_pokemon_common_sets where species='Grimmsnarl'), 2, 'Common set counts multiple samples');
select lives_ok($$update public.popular_teams set species_names=array['Pelipper'],team_json=jsonb_set(jsonb_set(team_json,'{members,0,species}','"Pelipper"'),'{members,0,name}','"Pelipper"') where id='00000000-0000-4000-8000-000000000022'$$, 'Admin changes species');
select is((select sample_size from public.popular_pokemon_common_sets where species='Grimmsnarl'), 1, 'Species change refreshes former species');
select is((select sample_size from public.popular_pokemon_common_sets where species='Pelipper'), 1, 'Species change refreshes new species');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"miguel20052002@gmail.com"}';
select ok(not public.is_popular_team_admin(), 'Forged JWT email does not grant admin');
select is((select count(*) from public.teams where name='A team'), 0::bigint, 'B cannot read A private team');
select is((select count(*) from public.popular_teams), 2::bigint, 'Regular authenticated user reads Popular');
select is((select count(*) from public.search_popular_teams('verification',array['Grimmsnarl'])), 1::bigint, 'Search RPC applies source and species filters under caller permissions');
select is((select count(*) from public.suggest_popular_teams('pokemon','Gri')), 1::bigint, 'Suggestion RPC returns fixture species');
with changed as (update public.popular_teams set name='stolen' returning id)
select is((select count(*) from changed), 0::bigint, 'Regular user cannot edit Popular');
with changed as (delete from public.popular_teams returning id)
select is((select count(*) from changed), 0::bigint, 'Regular user cannot delete Popular');
select is((select count(*) from public.popular_pokemon_common_sets), 2::bigint, 'Regular user reads derived common sets');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select lives_ok($$delete from public.popular_teams where id='00000000-0000-4000-8000-000000000021'$$, 'Admin deletes Popular');
select is((select count(*) from public.popular_pokemon_common_sets where species='Grimmsnarl'), 0::bigint, 'Last sample deletion removes common set');
select is((select sample_size from public.popular_pokemon_common_sets where species='Pelipper'), 1, 'Deletion preserves unaffected species');
select lives_ok($$delete from public.popular_teams where id='00000000-0000-4000-8000-000000000022'$$, 'Admin deletes remaining sample');
select is((select count(*) from public.popular_pokemon_common_sets), 0::bigint, 'No stale common sets remain');

reset role;
select * from finish();
rollback;
