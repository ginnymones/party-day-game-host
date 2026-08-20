# Party Day Game Host

An offline-first party hosting app. Toggle between a birthday/party banner and
live games — **Bring Me**, **Family Feud**, and **Jeopardy** — with click-to-reveal
answer cards. Built as an installable PWA so the game master's device runs with
zero connectivity; participant and audience screens update live when online.

## Highlights

- **Local-first / offline** — all data lives in the browser (IndexedDB via
  Dexie). The host can create parties, build games, and run everything with no
  internet.
- **Live sync (optional)** — when online and configured with Supabase, the game
  master broadcasts state over Realtime so audience/participant devices follow
  along instantly.
- **PIN auth** — simple username + PIN login, validated locally so it works
  offline. No email required.
- **Three views** — Game Master (full control), Audience (read-only display),
  and Participant (submit answers).
- **Roles** — Admin, Game Master, Participant, Audience.
- **PWA** — installable, with a service worker that caches the app shell for
  offline use.
- **Light/dark theme** + per-party color schemes.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Dexie (IndexedDB) ·
Supabase Realtime (optional) · Web Crypto for PIN hashing.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Demo accounts (seeded on first run)

| Role        | Username      | PIN      |
|-------------|---------------|----------|
| Game Master | `gamemaster`  | `banana` |
| Participant | `participant` | `bababa` |
| Audience    | `audience`    | `123456` |
| Admin       | `admin`       | `246810` |

### Enabling live sync + cloud save (optional)

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and
anon key. Without these, the app still works fully — just single-device/offline.

```bash
cp .env.example .env.local
```

Setting the keys enables two things:

1. **Live sync** — participant/audience devices follow the game master in real
   time. Works immediately, no database setup.
2. **Cloud save** — an account's parties and games are backed up and sync across
   devices. This one needs the database tables: open your Supabase project's SQL
   Editor and run the contents of [`supabase/schema.sql`](./supabase/schema.sql)
   once. It creates the `parties`/`games` tables and row-level security.

How cloud save works: local IndexedDB stays the source of truth so everything
works offline. Changes push to Supabase when online, and on login (or reconnect)
the app reconciles both directions with last-write-wins. Sign in with the same
username + PIN on any device and your games appear. A small "Saved to cloud"
badge in the header shows sync status.

Security note: rows are scoped by a secret key derived from your username + PIN
(sent as a header, enforced by RLS), so accounts can't read each other's data.
This favors zero-friction PIN auth over strict rigor and suits low-sensitivity
party data. For stronger guarantees, migrate to Supabase Auth and switch the
policies to `auth.uid()`.

## Flow

1. Sign in as `gamemaster` → **Host a party** → create a party.
2. Add a banner image and games (Bring Me / Family Feud / Jeopardy).
3. Hit **Run party** to open the game master screen. Toggle between the banner
   and a game; tap cards to reveal answers.
4. Open the **Audience view** on a TV/second screen (share the join code), and
   have participants **Join a party** with the code to submit answers.

## Deployment

Deploys to Vercel with zero config. Set the two `NEXT_PUBLIC_SUPABASE_*` env
vars in the Vercel project if you want live cross-device sync.

## Notes & tradeoffs

- Auth is intentionally local PIN-based (not NextAuth) so login works offline.
  PINs are salted + hashed with the Web Crypto API before being stored.
- Live sync uses Supabase Realtime **broadcast** channels (no DB schema needed),
  keeping the footprint small. Durable cloud persistence of parties is a natural
  next step (V2).
