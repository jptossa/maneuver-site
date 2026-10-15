-- Planned future workouts: an activity is either 'completed' (default, all existing rows)
-- or 'planned'. Apply in the Supabase SQL editor.
-- Keep the status list in sync with ACTIVITY_STATUSES in src/lib/types.ts.
-- RLS policies and grants from 0001/0002 already cover the new column.

alter table public.activities
  add column status text not null default 'completed'
  check (status in ('planned', 'completed'));
