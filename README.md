# kindling

Open the app, receive one kind message a stranger left, and leave one for the next person. Anonymous, one message at a time.

Built with Next.js (App Router, TypeScript), Supabase (Postgres), and the Google Gemini API. Styling is plain CSS, no Tailwind.

<img width="375" height="797" alt="kindling1" src="https://github.com/user-attachments/assets/04e1608d-dbc2-4495-be0d-40a259e30f9c" />
<img width="381" height="795" alt="kindling2" src="https://github.com/user-attachments/assets/087e59a7-5558-4857-92a7-c668a0d71a46" />
<img width="373" height="796" alt="kindling4" src="https://github.com/user-attachments/assets/218a88ee-4c66-4f5d-ab75-25b8efc70d01" />
<img width="372" height="796" alt="kindling3" src="https://github.com/user-attachments/assets/4e6c8b95-f83a-43ed-b43a-d0b5b7aae784" />


## How it works

Two pools of messages:

- Live pool (`messages`): notes real people chose and sent. Drawn once, then gone.
- Fallback pool (`fallback_messages`): 10 seed messages plus every AI suggestion the app generates over time. Never consumed, drawn at random. Covers cold start and any Gemini outage.

On open, the app tries to claim a live message atomically. If the live pool is empty, it draws from the fallback pool. The receiver cannot tell which pool it came from.

On compose, the sender picks a mood, Gemini generates three suggestions, and the sender picks one or writes their own. Custom text is run through a Gemini moderation check before it can enter the live pool. That check is the only real gate on what strangers receive, so it fails closed: if the model is unreachable, custom text is blocked rather than let through.

The one-give "see you tomorrow" state is a session convenience, not a hard cap. It lives in memory only, so a real page reload starts a fresh session (new receive, able to give again). This is intentional.

## Prerequisites

- Node.js 18.18 or newer
- A Supabase project (free tier is fine)
- A Google Gemini API key from Google AI Studio (https://aistudio.google.com/apikey)

## 1. Install

```bash
npm install
```

## 2. Set up Supabase

1. Create a project at https://supabase.com (New project, pick a name and a database password, wait for it to provision).
2. Open the SQL editor: Dashboard > SQL Editor > New query.
3. Paste the entire contents of `supabase/schema.sql` and run it. This creates the three tables, the atomic claim function, the daily counter function, row level security, and seeds the 10 base messages.
4. Get your keys: Dashboard > Project Settings > API.
   - Project URL goes in `SUPABASE_URL`.
   - The `service_role` key (under Project API keys, marked secret) goes in `SUPABASE_SERVICE_ROLE_KEY`. This key bypasses row level security and must stay server-side. Never expose it to the browser or commit it.

To confirm the seed worked: Dashboard > Table Editor > `fallback_messages` should show 10 rows with origin `seed`.

## 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from step 2.
- `GEMINI_API_KEY` from Google AI Studio.

All three are server-only. None are prefixed `NEXT_PUBLIC`, so none reach the browser.

## 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000. First open draws a seed message (live pool is empty). Leave one to add a real message to the live pool, then reload to receive it.

## 5. Deploy to Vercel

Yes, Vercel is the intended host.

1. Push this folder to a Git repo (GitHub, GitLab, or Bitbucket).
2. In Vercel, New Project, import the repo. Framework is auto-detected as Next.js, no build config needed.
3. Before deploying, add the three environment variables under Project Settings > Environment Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`. Add them to Production (and Preview if you want preview deploys to work).
4. Deploy. Supabase is a separate managed service, so nothing about the database changes between local and Vercel. The same project serves both; only the environment variables move.

If you add env vars after the first deploy, trigger a redeploy for them to take effect.

## Project layout

```
supabase/schema.sql        tables, functions, RLS, seed data
src/app/page.tsx           flow state machine (receive > compose > sent)
src/app/api/receive        claim live, fall back to fallback pool
src/app/api/suggest        generate 3 suggestions, save to fallback pool
src/app/api/send           moderate custom text, insert to live pool, bump counter
src/lib/gemini.ts          generation + moderation calls
src/lib/supabase.ts        server client (service role)
src/lib/moods.ts           mood definitions
src/components             Arrival, Compose, Sent
```

## Deliberate decisions worth knowing

- Atomic claim: `claim_live_message()` marks a message consumed in the same statement it selects it, with `FOR UPDATE SKIP LOCKED`, so two simultaneous opens can never get the same message.
- Moderation fails closed. A safety gate that lets everything through when the model is down is not a safety gate.
- Generated suggestions are saved to the fallback pool only, never the live pool. The live pool stays real-humans-only until it is empty.
- The daily gate is session memory, not `localStorage`, so a reload resets it on purpose.

## Things to harden before real launch

- Rate limiting on `send` (for example by IP), since without login the moderation classifier is the only thing stopping someone flooding the live pool.
- A moderation eval set: a labeled list of borderline messages to measure the classifier's precision and recall as you tune the prompt. This is the core AI-product artifact here.
- Move the fallback random pick into SQL if the fallback pool grows large.
