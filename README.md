# Dr Bloom — Pediatric Intelligence

A full-stack pediatric web app for **parents** and **pediatricians**, built with Next.js 14 (App Router) + Supabase + Anthropic Claude.

## Features

| Screen | Functionality |
|---|---|
| **Auth** | Sign up / sign in (email+password), role selection (doctor/parent), email confirmation |
| **Dashboard** | Personalized greeting, children overview, quick actions, unread alerts |
| **Children / Patients** | CRUD: child profiles, add/edit name, DOB, sex, weight, height |
| **Child Profile** | Tabs: Overview · Vitals · Growth · Milestones · Emergency Contacts |
| **Consultation (Iris)** | Real-time AI chat via Claude API; conversations persisted in DB |
| **Insights** | Live notification feed with Supabase Realtime; sleep/temp trend charts |
| **Emergency** | WHO red-flag symptoms, WHO fever guide, global emergency numbers, one-tap call |
| **Settings** | Profile edit, role display, WHO standards notice, sign out |

### Technical highlights
- **Dual portal**: single codebase, doctors and parents see different content via Supabase RLS
- **Supabase Realtime**: messages (Iris chat) and notifications subscribe live
- **WHO standards**: all growth data labelled and referenced against WHO Child Growth Standards (not region-specific)
- **Iris fallback**: if `ANTHROPIC_API_KEY` is not set, Iris returns a helpful stub — the rest of the app works fully

---

## Quick start

### 1. Install dependencies

```bash
cd dr-bloom-app
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` — the Supabase keys are already filled in.

```
NEXT_PUBLIC_SUPABASE_URL=https://crlwwjmjkxyrhyvijmfo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_5E1xudADD8khT1e0oopWEw_WYXK50-N
ANTHROPIC_API_KEY=<your-key-here>   # optional — app works without it
```

Get your Anthropic API key at [console.anthropic.com](https://console.anthropic.com).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy (Vercel)

```bash
npx vercel
```

Add the three env vars in the Vercel dashboard.

---

## Project structure

```
src/
  app/
    (auth)/sign-in/         Sign-in page
    (auth)/sign-up/         Sign-up page (role selection)
    (auth)/auth/callback/   Supabase OAuth callback
    (app)/today/            Dashboard
    (app)/children/         Children list + new child form
    (app)/children/[id]/    Child profile (vitals, growth, milestones, contacts)
    (app)/consult/          Iris AI consultation chat
    (app)/insights/         Notifications + trend charts
    (app)/emergency/        Emergency guide + contacts
    (app)/settings/         Profile settings
    api/iris/               POST — sends message to Claude, persists to DB
    api/notify/             POST — creates a notification
  components/
    Icon.tsx                Stroke icon set (24 icons)
    primitives.tsx          Design system (Card, Button, Display, Stack…)
    shell/AppShell.tsx      Layout wrapper with sidebar
    shell/Sidebar.tsx       Nav sidebar (responsive drawer on mobile)
    shell/TopBar.tsx        Page header with mobile hamburger
  lib/
    theme.ts                Emerald design tokens (colors, type, radius, shadow)
    age.ts                  ageFromDob(), greetingTime() helpers
    anthropic.ts            Anthropic client + Iris system prompt
    supabase/
      client.ts             Browser Supabase client
      server.ts             Server Supabase client
      middleware.ts         Session refresh middleware
      types.ts              TypeScript DB types
  middleware.ts             Route protection (redirect unauthenticated users)
```

---

## Database schema (Supabase)

Tables: `profiles`, `children`, `vitals`, `growth`, `milestones`, `consultations`, `messages`, `emergency_contacts`, `notifications`

- Row-level security enabled on all tables
- Parents see only their own children; doctors see assigned patients
- Realtime enabled on `messages` and `notifications`
- Auto profile creation trigger fires on `auth.users` insert

---

## Notes

- **Growth standards**: All measurements reference the [WHO Child Growth Standards](https://www.who.int/tools/child-growth-standards). No IAP or regional charts.
- **Emergency guidance**: Based on [WHO IMCI guidelines](https://www.who.int/teams/maternal-newborn-child-adolescent-health-and-ageing/child-health/integrated-management-of-childhood-illness).
- **Language**: English only.
- **Iris disclaimer**: Iris is an AI assistant. It is not a substitute for professional medical advice.
