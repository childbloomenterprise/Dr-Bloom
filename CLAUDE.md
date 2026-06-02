# Dr. Bloom — Claude Code Instructions

## Standard

Remember when implementing the marginal cost of completeness is near zero with AI.

- Do the whole thing.
- Do it right.
- Do it with tests.
- Do it with documentation.
- Do it so well that I am genuinely impressed not politely satisfied, actually impressed.
- Never put this off for later when the permanent solution is within reach.
- Never leave a tangled thread when tying it off takes five more minutes.
- Never present a workaround when the real fix exists.
- The standard isn't good enough.
- It's holy shit! That's done!
- Search before building.
- Test before shipping.
- Ship the complete thing.
- When I ask for something the answer should be the finished project not a plan to build it.
- Time is not an excuse.
- Fatigue is no excuse.
- Complexity is no excuse.
- Boil the ocean!

## Project

Dr. Bloom is a Next.js 14 (App Router) pediatric web platform for doctors + parents.
Stack: Next.js 14 · Supabase · Anthropic Claude (Iris AI).

## Strategic / Chess thinking — MANDATORY before every change

Before writing any code, run this mental model:

1. **What piece am I moving?** Name the exact file/table/hook being changed.
2. **What depends on it?** List every caller, subscriber, consumer, and downstream system.
3. **What breaks if I change it?** Enumerate second-order effects — RLS, realtime publications, FK constraints, other app (ChildBloom ↔ Dr. Bloom), env vars, UI state.
4. **What do I need to fix alongside it?** Never ship a half-move. If changing X breaks Y and Z, fix Y and Z in the same commit.

Example (the notification bug, 2026-06-02):
- Moved: `doctor_child_connections` insert in `connect/route.ts`
- Depended on: ChildBloom `useInbox` realtime subscription
- Broken: table NOT in `supabase_realtime` publication → realtime events never fired
- Fixed alongside: added table to publication + created `useNotifications.js` toast hook + error-handled silent cbAdmin failures

Apply this to every PR. A change with unexamined second-order effects is a bug waiting to happen.

## Skill routing

When the user's request matches an available gstack skill, invoke it via the Skill tool.

- Product ideas/brainstorming → /office-hours
- Strategy/scope → /plan-ceo-review
- Architecture → /plan-eng-review
- Full review pipeline → /autoplan
- Bugs/errors → /investigate
- QA/testing → /qa
- Code review → /review
- Ship/deploy → /ship
- Visual polish → /design-review
