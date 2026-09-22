create table public.team_collections (
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  list_kind text not null check (list_kind in ('own', 'opponent')),
  created_at timestamptz not null default now(),
  primary key (user_id, team_id, list_kind)
);

create index team_collections_user_kind_idx on public.team_collections(user_id, list_kind);

alter table public.team_collections enable row level security;

create policy "Users can read their own team collections"
on public.team_collections for select
using (auth.uid() = user_id);

create policy "Users insert their own team collections"
on public.team_collections for insert
with check (auth.uid() = user_id);

create policy "Users delete their own team collections"
on public.team_collections for delete
using (auth.uid() = user_id);
