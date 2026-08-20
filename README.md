# Party Day Game Host

An offline-first party hosting app. Toggle between a birthday/party banner and
live games — **Bring Me**, **Family Feud**, and **Jeopardy** — with click-to-reveal
answer cards. Built as an installable PWA so the game master's device runs with
zero connectivity; participant and audience screens update live when online.

## Highlights

- **Local-first / offline** — all data lives in the browser (IndexedDB via
  Dexie). The host can create parties, build games, and run everything with no
  internet.
- **Cloud save (optional)** — an account's parties and games back up to Supabase
  and sync across devices. Local stays the source of truth; changes reconcile on
  login/reconnect (last-write-wins).
- **Live sync (optional)** — when online, the game master broadcasts state over
  Supabase Realtime so audience/participant/co-host devices follow along.
- **PIN auth** — simple username + PIN login, validated locally so it works
  offline, backed by cloud accounts so a login works on any device.
- **PWA** — installable, with a service worker that caches the app shell.
- **Light/dark theme** + per-party color schemes.

## Roles

Roles are contextual, not global:

- **Account owner** — every account is the admin of its own data. Anyone signed
  in can create parties.
- **Game master** — you become the game master of any party you create. Full
  control: build games, run the session, reveal cards, manage co-hosts.
- **Co-host** — added by the game master by username (must have their own
  account). Gets **live control only** — switch banner/game and reveal cards
  during a running session — but can't edit games or see the party in their own
  library.
- **Participant** — **no account needed.** Joins with a name + the party link and
  submits answers.
- **Audience** — public, no login. Watches the game master's screen via the code.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Dexie (IndexedDB) ·
Supabase (optional, for cloud save + live sync) · Web Crypto for PIN hashing.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Create an account from the sign-up screen, or use the
demo login `gamemaster` / `banana` to try it offline.

## Enabling cloud save + live sync (optional)

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and
anon key. Without these, the app still works fully — just single-device/offline
and without cross-device accounts or co-hosting.

```bash
cp .env.example .env.local
```

Then, one-time, open your Supabase project's SQL Editor and run the contents of
[`supabase/schema.sql`](./supabase/schema.sql). It creates the `accounts`,
`parties`, and `games` tables and their row-level security. Restart the dev
server so it picks up the env vars.

How it works:

- **Accounts** live in the `accounts` table so a username+PIN works on any
  device. Login checks the cloud first and creates a local mirror for offline use.
- **Cloud save** mirrors parties/games to the cloud and reconciles both
  directions. A "Saved to cloud" badge in the header shows sync status and lets
  you force a sync.
- **Security** — every cloud row is scoped by a secret key derived from the
  user's username + PIN (sent as a header, enforced by RLS), so accounts can't
  read each other's data. This favors zero-friction PIN auth over strict rigor
  and suits low-sensitivity party data. For stronger guarantees, migrate to
  Supabase Auth and switch the policies to `auth.uid()`.

## Typical flow

1. Sign in (or sign up), then **Host a party** → create a party.
2. Add a banner image and games (Bring Me / Family Feud / Jeopardy).
3. (Optional) Add **co-hosts** by username, and use **Copy co-host link** to
   invite them. Use **Copy participant link** for guests who'll submit answers.
4. Hit **Run party** to open the game master screen. Toggle between the banner
   and a game; tap cards to reveal.
5. Open the **audience view** on a TV/second screen. Participants open the
   participant link (no account) to submit answers. Co-hosts open the co-host
   link (their own account) to help drive the session.

## Co-host live control — how it works

The game master's device is the source of truth. Co-hosts send control actions
over the live channel; the owner's device applies them only for usernames on its
co-host allowlist, then re-broadcasts the new state. So co-hosting requires live
sync to be configured and the owner to be actively running the party. The gate is
the join code plus the username allowlist (not cryptographic), which suits a
party with trusted guests.

## Deployment

Deploys to Vercel with zero config. Set the two `NEXT_PUBLIC_SUPABASE_*` env vars
in the Vercel project for cloud save + live sync, and run `supabase/schema.sql`
once in Supabase. Every push to `main` auto-deploys.

## Notes & tradeoffs

- Auth is local-first PIN-based (not NextAuth) so login works offline; cloud
  accounts make a login portable across devices.
- Co-host control is a live-session feature, not shared editing — co-hosts never
  gain access to another account's stored data.
