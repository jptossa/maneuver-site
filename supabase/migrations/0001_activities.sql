-- Maneuver: per-user activity log.
-- Apply in the Supabase SQL editor (or `supabase db push`).
-- Keep the `type` list in sync with ACTIVITY_TYPES in src/lib/types.ts.

create table public.activities (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date         date not null,
  type         text not null check (type in (
                 'walking', 'running', 'cycling', 'hiking',
                 'swimming', 'commuting', 'strength', 'yoga'
               )),
  duration_min integer not null check (duration_min > 0),
  distance_km  numeric(7, 2) check (distance_km is null or distance_km >= 0),
  notes        text,
  created_at   timestamptz not null default now()
);

create index activities_user_date_idx on public.activities (user_id, date);

alter table public.activities enable row level security;

create policy "Users read own activities"
  on public.activities for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own activities"
  on public.activities for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own activities"
  on public.activities for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own activities"
  on public.activities for delete to authenticated
  using ((select auth.uid()) = user_id);
