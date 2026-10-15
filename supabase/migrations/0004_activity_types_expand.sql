-- Maneuver: expand the allowed activity types.
-- Apply in the Supabase SQL editor. Strict superset of the old list, so existing rows stay valid.
-- Keep the list in sync with ACTIVITY_CATALOG in src/lib/activity-catalog.ts.
-- 0001 declared the check inline, so Postgres named it activities_type_check.

alter table public.activities drop constraint activities_type_check;

alter table public.activities add constraint activities_type_check check (type in (
  'walking', 'running', 'cycling', 'hiking', 'rowing', 'elliptical',
  'stair_climbing', 'jump_rope', 'dancing',
  'swimming', 'kayaking', 'paddleboarding', 'surfing',
  'strength', 'hiit', 'calisthenics', 'climbing',
  'yoga', 'pilates', 'stretching', 'tai_chi',
  'soccer', 'basketball', 'tennis', 'pickleball', 'martial_arts', 'golf',
  'skiing', 'snowboarding', 'ice_skating',
  'commuting', 'gardening', 'other'
));
