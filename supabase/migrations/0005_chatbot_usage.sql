-- Maneuver: daily usage counter for rationed chatbot features (currently: Sonnet escalations).
-- Apply in the Supabase SQL editor.
--
-- The count is site-wide, not per user, and the day is the database's current_date (UTC).
-- Nobody can read or write the table directly (RLS on, no policies, no grants); the only way
-- in is claim_chatbot_use(), which increments atomically and says whether the caller got a slot.
-- It must work for logged-out visitors too, so it is executable by anon and authenticated.
--
-- Trade-off: the Supabase publishable key is public, so anyone could call this function and
-- use up the day's slots, which would just keep the chatbot on its default model until
-- tomorrow. It can't cost money or expose data. Revisit if that ever happens.

create table public.chatbot_usage (
  day  date    not null,
  kind text    not null,
  uses integer not null default 0,
  primary key (day, kind)
);

alter table public.chatbot_usage enable row level security;
revoke all on public.chatbot_usage from anon, authenticated;

create or replace function public.claim_chatbot_use(p_kind text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer;
begin
  -- Only known kinds, so callers can't fill the table with junk rows.
  if p_kind <> 'sonnet' or p_limit < 1 then
    return false;
  end if;

  -- First use of the day inserts; later uses increment only while under the limit.
  -- When the limit is reached the update is skipped, nothing is returned, and claimed stays null.
  insert into public.chatbot_usage as u (day, kind, uses)
  values (current_date, p_kind, 1)
  on conflict (day, kind) do update
    set uses = u.uses + 1
    where u.uses < p_limit
  returning u.uses into claimed;

  return claimed is not null;
end;
$$;

revoke all on function public.claim_chatbot_use(text, integer) from public;
grant execute on function public.claim_chatbot_use(text, integer) to anon, authenticated;
