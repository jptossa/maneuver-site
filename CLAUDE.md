# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Maneuver tracks movement-based activity (exercise, commuting, hiking, etc.) per day/week/month/year. Stack: Next.js (App Router, TypeScript) + Supabase (email/password auth, Postgres with RLS). Styling is intentionally minimal and deferred. Planned but not built: a chatbot agent for activity recommendations/logging.

## Rules for this session setup

- Do NOT read `.env*` files or environment variables (no `cat .env`, `env`, `printenv`, `Get-ChildItem Env:`, etc.).
- Next.js here is a newer major version (16.x) than most training data. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # production build (also generates PageProps/LayoutProps types)
npm run lint         # eslint
npx tsc --noEmit     # typecheck — run `npm run build` (or `npx next typegen`) first, otherwise the global PageProps/LayoutProps types are missing and it errors
```

There is no test runner configured yet.

## Architecture

**Cache Components is enabled** (`cacheComponents: true` in `next.config.ts`). This drives how pages must be written:
- Pages that read `searchParams` or `new Date()` are a sync page shell plus an async inner component wrapped in `<Suspense>` (see `src/app/activity/page.tsx`, `src/app/charts/page.tsx`). Inside the inner component: `await searchParams`, then `await connection()` (from `next/server`) **before** `new Date()`, otherwise the page hangs on its Suspense fallback with a "blocking-prerender-current-time" error.
- Page props use the global `PageProps<"/route">` / `LayoutProps<"/">` helpers; `searchParams` is a Promise.
- In the in-app browser, streamed content may not swap in while the tab is backgrounded; check SSR output with `curl` if a page looks stuck on "Loading…".

**View state lives in the URL**, not client state: `?scale=day|week|month|year&date=yyyy-MM-dd&metric=minutes|distance|sessions`. Tabs/prev/next/metric toggles are plain `<Link>`s built with `buildHref` (`src/lib/href.ts`). Invalid params fall back to week/today (`parseScale`/`parseDate`/`parseMetric` in `src/lib/period.ts`). Only the Recharts components (`src/components/charts/ActivityBarChart.tsx`, `TypeBreakdownChart.tsx`) are `"use client"`.

**Data flow** (`src/lib/`):
1. `types.ts` — `Activity` is the camelCase form of a `public.activities` row (id, date, type, durationMin, distanceKm, notes); `ACTIVITY_TYPES`, `TIMESCALES`, `METRICS` are the source-of-truth const arrays. `ACTIVITY_TYPES` must match the CHECK constraint in the migration.
2. `data.ts` → `getActivities({from, to})` is the **single seam** that queries Supabase (rows mapped snake_case → `Activity`); `hasAnyActivity()` drives the empty-account state. RLS scopes everything to the signed-in user. PostgREST caps responses at 1000 rows.
   The write path (`getActivity`, `createActivity`, `updateActivity`, `deleteActivity`) also lives in `data.ts`; update/delete throw `ActivityNotFoundError` when zero rows match (missing or hidden by RLS). Keep these as plain functions, not form-coupled, so other callers (e.g. a future chatbot tool) can reuse them.
   - Planned workouts: `activities.status` is `planned` | `completed` (`ACTIVITY_STATUSES`, migration `0003`; default `completed`). `getActivities` takes `status` and **defaults to `"completed"`** so charts/summaries never include plans; `/activity` passes `"all"` and renders plans in `PlannedList`. Date rules in `parseActivityInput(raw, today, status)`: completed ≤ today, planned ≥ today. `completeActivity` ("Mark done") keeps the date unless it's in the future, then uses today. `resolvePeriod(..., { allowFuture: true })` lets `/activity` navigate forward; `/charts` doesn't.
   - Logging flow: `/activity/new` and `/activity/[id]/edit` render `ActivityForm` (client, `useActionState`) → server actions in `src/app/activity/actions.ts` → `parseActivityInput` (`src/lib/activity-input.ts`, the single place input rules live; future dates are rejected) → `data.ts`. Edit/Delete controls are on the day view of `/activity`. Planning uses `/activity/plan` (same `ActivityForm`, `createPlannedActivityAction`); `updateActivityAction` gets the status bound by the edit page.
3. `mock-data.ts` — deterministic generator (~400 days ending today, seeded **per date**); now only used by the `loadSampleData` server action (`src/app/activity/actions.ts`) to give an empty account demo data.
4. `period.ts` — `resolvePeriod(scale, anchor, today)` → start/end/label/prev/next (weeks start Monday, uses `date-fns`).
5. `aggregate.ts` — `bucketActivities` (day → one bucket per activity; week/month → daily buckets; year → monthly buckets; empty buckets included as zeros), `summarize`, `totalsByType`.

Pages (`/` landing, `/activity` tracker table, `/charts` graphs) are thin: resolve period → `getActivities` → aggregate → render shared components in `src/components/`.

**Activity assistant (chatbot)**: `/assistant` page (`ChatWidget`, client) → `POST /api/chat` (`src/app/api/chat/route.ts`) → `runAgent` (`src/lib/chatbot/agent.ts`), a manual tool loop on the Anthropic Messages API (`@anthropic-ai/sdk`, non-streaming, model `CHATBOT_MODEL` defaulting to `claude-haiku-5-5`, `effort: "low"`).
- Everything tunable is in `src/lib/chatbot/config.ts` (model, the fictional escalation rep "Sifu Sensei" + phone, limits). Persona/scope/escalation rules are the system prompt in `prompt.ts`, built per request (it embeds today's date).
- Logged-out visitors get no tools (suggestions only). Signed-in users (checked with `auth.getClaims()` in the route) get `get_activity_history`, `log_activity`, `plan_activity` from `tools.ts`; writes go through `parseActivityInput` + `createActivity` — the same rules and data seam as the forms. The assistant cannot edit/delete.
- The client keeps only plain-text turns and resends them each request; tool calls/thinking blocks never leave `runAgent`. `ANTHROPIC_API_KEY` is server-only; without it the route answers 503. Rate limiting (`rate-limit.ts`) is in-memory best-effort; the Anthropic console spend limit is the real backstop.

**Supabase / auth**:
- Schema lives in `supabase/migrations/*.sql` and is applied manually in the Supabase SQL editor (no CLI project). `user_id` defaults to `auth.uid()`, so inserts never send it. New tables need an explicit `grant … to authenticated` (see `0002_activities_grants.sql`) in addition to RLS policies, or queries fail with "permission denied for table".
- `src/lib/supabase/server.ts` `createClient()` is the per-request client (cookie-bound, so it must run inside a `<Suspense>` boundary under Cache Components). Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (names in `.env.example`; values go in `.env.local`, which must not be read). No service-role key is used anywhere.
- `src/proxy.ts` (Next 16's replacement for `middleware.ts`) refreshes the session and redirects logged-out users from `/activity` and `/charts` to `/login?next=…`. It's an optimistic check only; RLS is the real authorization. Verify users with `auth.getClaims()`, not `getSession()`.
- Auth is server actions in `src/app/auth/actions.ts` plus `src/app/auth/confirm/route.ts` for email-confirmation links. Post-login redirect targets go through `safeNext` (`src/lib/auth.ts`) — keep using it for any `next` param.
- Remote Supabase: don't create accounts on it while testing; signed-in flows are verified by the user.
