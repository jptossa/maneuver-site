-- Table privileges for the Data API roles.
-- RLS policies (0001) only filter rows; the role still needs privileges on the table,
-- which Supabase does not always grant automatically for tables created in the SQL editor.
-- `anon` gets nothing: logged-out visitors can't read or write activities.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
