# Dr. Bloom ↔ ChildBloom — Unification Cutover Runbook

Goal: collapse the two-Supabase-project setup into **one project** (ChildBloom,
`qkjwmcmdevtbvcanamjg`) with **one doctor identity**, and retire the near-empty
`dr-bloom` project (`crlwwjmjkxyrhyvijmfo`).

## What's already done (in code, on `feat/cross-app-clinical-cockpit`)
The whole doctor app is now cross-app. Every screen reads/writes the ChildBloom
("unified") project; nothing depends on the per-app schema anymore.

- **Today / Patients / Consult** — already targeted ChildBloom.
- **Insights** — rebuilt over ChildBloom (doctor alerts from unified
  `notifications.recipient_id` + active connected children).
- **Settings** — rebuilt over `user_profiles` + `doctor_profiles` (server action
  save); dropped the non-existent `profiles.specialty/hospital`.
- **Children (siloed Gen-1 list/new/[id])** — retired → redirect to `/patients`.
- **connect route** — single ChildBloom write (no dual-write / no stale copy),
  doctor identity from `user_profiles` + `doctor_profiles`.
- **childbloom-admin client** — falls back to `NEXT_PUBLIC_SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY`, so one project's env vars suffice after cutover.
- `createAdminClient` (auth/signup, notifications/internal, message) is
  env-driven — it becomes ChildBloom automatically once the env vars below flip.

Verified: `tsc --noEmit` clean; `next build` compiles all routes.

## The cutover (the only steps that need a human)

### 1. Flip the Vercel env on the `dr-bloom` project
Set these to the **ChildBloom** project (Supabase → Settings → API):
```
NEXT_PUBLIC_SUPABASE_URL      = https://qkjwmcmdevtbvcanamjg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = <ChildBloom anon key>
SUPABASE_SERVICE_ROLE_KEY     = <ChildBloom service-role key>
```
- `CHILDBLOOM_SUPABASE_URL` / `CHILDBLOOM_SERVICE_ROLE_KEY` can be left as-is or
  removed (the client falls back to the primary vars).
- Keep `ANTHROPIC_API_KEY`.

### 2. Merge `feat/cross-app-clinical-cockpit` → `main`
Vercel redeploys the doctor app against the unified project.

### 3. Recreate the 2 doctor accounts
Auth now lives in ChildBloom. The old `dr-bloom`-project logins won't carry over
(they're test accounts). Sign up again on the doctor app → the signup route
creates their `user_profiles` + `doctor_profiles` rows in ChildBloom.

### 4. Verify (live)
- Doctor sign-in → lands on Today.
- Patients lists connected children; open one → clinical cockpit loads.
- Record a vaccine / prescription / visit → appears in the **parent's** ChildBloom
  app ("From your doctor") + parent gets a realtime toast.
- Parent approves a new request → doctor sees it.
- Settings save persists; Insights shows alerts.

## Post-cutover cleanup (Stage 4–6)
- **ChildBloom `api/connections/respond.js`**: replace the cross-app HTTP notify
  (`${DRBLOOM_URL}/api/notifications/internal`) with a direct insert into the
  shared `notifications` table (`recipient_id = doctor_id`). The doctor's Insights
  reads ChildBloom notifications, so this removes the HTTP hop **and**
  `DRBLOOM_INTERNAL_KEY` from both apps.
- **Doctor RLS**: if/when doctor reads move off the service role, add
  "connected doctor can read" policies on `growth_records` / `food_logs` (the
  `growth_measurements` / `feeding_logs` views are `security_invoker`).
- **Retire the `dr-bloom` Supabase project** (`crlwwjmjkxyrhyvijmfo`) once the
  above is verified — pause first, delete after a safe window.
- **Drop the `ensure_doctor_shadow` RPC** usage (doctors are real ChildBloom auth
  users now, so the FK shadow hack is unnecessary).

## Security
The ChildBloom `service_role` key was shared in chat during this work — **rotate
it** (see `Code Base/SECRETS_ROTATION.md`) and update the Vercel env on both apps.
