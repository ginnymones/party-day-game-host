# Vibe Coding Template

Use this template at the start of any AI-assisted coding session to front-load decisions and reduce rework.

---

## Phase 0: Project Brief (fill this out before coding starts)

### What am I building?
> You are building a party hosting app for users aged 20-45 that will enable users to toggle between displaying a birthday banner (image will be provided by the user) and a set of games. This app will also enable users to build games in the style of "Bring Me" (where the host will display on the screen what is being asked), "Family Feud" (where the host shows a question with 4-5 answers ranked accordingly, and will gradually reveal the answers by clicking on the answer cards), and "Jeopardy" (where there will be categories, under which there will be 4-5 answers that wil also be gradually revealed by clicking on the cards). Game types can be added in the future.

### Who is it for?
> The primary users are party hosts who are hosting a gathering onsite — as in birthdays, company parties, and the like. Secondary users are people who might want to use this online. For this purpose, a pin auth type of login would be great, nothing too complicated. The initial build will be used by 2 people, then we are aiming to scale up to 200.

### What are the 3 core things a user must be able to do in V1?
> 1. Run offline, without need for internet connection. The data can be synced once internet connection is available.
> 2. Display the question or the challenge on the screen, and reveal the answers by clicking on the answer cards
> 3. Switch between image display (a party banner) and the games and Hhave different views: game master view (full control of the app), participant view (input answers for the game chosen by the game master), and an audience view (no input required, the audience just has to see the question/category and the answers as they are revealed)

### What can wait for V2?
> Link sharing so that audience can also see the games
> Enable participants to join the game through the link (remote participation), while onsite session is conducted
> N/A

---

## Phase 1: Infrastructure Decisions (decide before writing code)

### Working with AI — Ground Rules
- If something is ambiguous, ask before guessing
- If the AI proposes something you don't understand, ask "why?"
- If a feature feels like scope creep, say "that can wait for v2"
- Test each deploy yourself — don't assume it works because the build passed
- If something fails twice, ask for a different approach rather than incremental patches
- State your constraints upfront (timeline, hosting, team size) so the AI can calibrate

### Authentication
> Pick one. Don't change mid-build.

| Option | When to use |
|--------|-------------|
| None | Demo, proof of concept, internal tool with no sensitive data |
| PIN/passphrase | Personal tool, small group, no email needed |
| OAuth (Google/GitHub) | Team tool, need real identity, org-level |
| Email magic link | User-facing product, no password friction |
| Full credentials | Enterprise, compliance requirements |

**My choice:** PIN auth
**Reason:** This is an immediate need with a small userbase. Fast and accurate deployment is key. For V2, we simply need to prepare for more users (possibly) but will not ask for any sensitive data.

### Database
> Pick one. Confirm free tier limits cover your use case.

| Option | When to use |
|--------|-------------|
| None (in-memory/localStorage) | Demo only, no persistence needed |
| JSON file in repo | Solo tool, git-based persistence, no multi-user |
| Supabase (PostgreSQL) | Multi-user, relational data, free tier generous |
| Vercel KV (Redis) | Simple key-value, session storage |
| PlanetScale / Neon | MySQL/PostgreSQL alternatives |

**My choice:** Please recommend based on the details given above
**Connection string format confirmed?** Please recommend based on the details given above
**Special characters in password?** Enabled but not required

### Hosting
> Pick one. Confirm it supports your stack.

| Option | When to use |
|--------|-------------|
| Vercel | Next.js, zero-config, free tier |
| Netlify | Static sites, serverless functions |
| Railway / Render | Docker, long-running processes |
| Internal (Protozoa, etc.) | Org-specific, may need Docker |
| Static file host | Single HTML file, no server needed |

**My choice:** Enable Vercel and static deployment
**Root directory (if monorepo):** / (root)
**Environment variables needed:**
- `DATABASE_URL` — Supabase pooled connection (port 6543, PgBouncer)
- `DIRECT_URL` — Supabase direct connection (port 5432, used by Prisma)
- `NEXTAUTH_SECRET` — Random secret for JWT signing
- `NEXTAUTH_URL` — Production URL (auto-detected on Vercel)

### Framework & Stack
> Confirmed and pinned.

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js (App Router) | 14.2.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS + shadcn/ui | 3.4.x |
| Charts/UI libs | Recharts (lazy-loaded) | 3.x |
| ORM/data layer | Prisma + @prisma/adapter-pg | 7.8.x |
| Auth library | NextAuth.js | 5.0.0-beta.31 |
| Markdown | react-markdown + remark-gfm | 9.x / 4.x |
| Testing | Vitest + fast-check | 4.x |

---

## Phase 2: Visual Direction (decide before building UI)

### Theme
- [ ] Light mode
- [ ] Dark mode
- [x] Both (toggle) - light mode primarily, with option to switch to dark mode

### Vibe
> Pick 2-3 adjectives: minimalist, straightforward, not intimidating

### Colors (define upfront, verify WCAG AA contrast)
```
Background:    #FAF9F7
Card:          #FFFFFF
Text primary:  #111111
Text muted:    #2F3162
Accent:        #6970EB
Button:        #3E47E7
Success:       #2CC156
Warning:       #E47927
Danger:        #E34848
```

### Key screens to build
> List the pages/views in order of priority. Use the format "Name of page (function)" i.e. "Resource Matchmaker (Search for available associates by skills, proficiency, and available hours. Results ranked by match score. Pending approvals panel for managers.)"
> 1. Login (PIN auth)
> 2. Home screen (Allow users to select if they are hosting a party or joining a party. Join party requires a party link.)
> 3. Host party screen (Input key details about the party like the name of the party, the banner image to be used as default display)
> 4. Game setup/settings screen (Add new game with selection for the types identified above -- we can add more to this later on; Edit game category/question/answers; Save changes)
> 5. Game master screen (Enable toggling between the banner and the game selection)
> 6. Audience screen (Show game master's selected mode, no input needed)
> 7. Admin panel

### UX Principles
- Use realistic content in all user-facing flows (no placeholder text)
- Accessible by default (WCAG AA contrast, semantic HTML, aria labels)
- Mobile-first: design for smallest screen, scale up
- Loading states and error states for every async action
- Feedback on every user action (success messages, disabled states during submission)
- Pointer cursor on all interactive elements

---

## Phase 3: Build Order (follow this sequence)

```
1. Scaffold project with chosen stack
2. Set up database schema + push to remote
3. Set up auth (even if minimal)
4. Verify: can I sign in and hit the database? ✓
5. Build core data flow (create, read, update, delete)
6. Verify: can I CRUD data through the API? ✓
7. Build UI skeleton (layout, routing, empty states)
8. Wire UI to real data
9. Verify: full flow works end-to-end? ✓
10. Polish (charts, animations, responsive, accessibility)
11. Deploy
12. Test on real device (mobile + desktop)
13. Fix issues found in testing
14. Document
```

**Key principle:** Verify at each checkpoint before moving forward. Don't build UI on top of broken infrastructure.

---

## Phase 4: Roles & Permissions (implemented)

| Role | Access |
|------|--------|
| **Participant** | Input game link, set name of participant, input answers to games. |
| **Game Master** | Create party, create game, edit and save changes to game, reveal answers as s/he clicks on the cards, change color scheme for party (i.e. primary colors, secondary colors, pastel colors, autumn colors, etc.). |
| **Admin** | Full access + User management |

**Test accounts:**
- `participant` / PIN `bababa` — Participant
- `gamemaster` / PIN `banana` — Game Master
- `audience` / PIN `123456` — Audience

---

## Phase 5: Deployment Checklist (completed)

- [ ] Environment variables set in hosting platform
- [ ] Database schema pushed to production database
- [ ] Auth callback URLs registered (if OAuth) — N/A for PIN auth
- [ ] `.gitignore` covers: `node_modules`, `.next`, `.env.local`, `.env`, `*.csv`
- [ ] No secrets in committed files
- [ ] Build passes locally before pushing
- [ ] Tested on mobile viewport

---

## Phase 6: Post-Deploy Testing Script

Run through these manually after first deploy:

- [ ] Can I access the app at the URL?
- [ ] Can I sign in / create account?
- [ ] Can I create data?
- [ ] Can I read data back?
- [ ] Can I edit data?
- [ ] Can I delete data?
- [ ] Does it work on my phone?
- [ ] Does the public/shared view work (if applicable)?
- [ ] Are error states handled (wrong password, network failure)?

---

## Lessons Learned (fill after each project)

### What went well?
> - [ ] 

### What would I do differently next time?
> - [ ] 

---

## Quick Reference: Common Gotchas

| Issue | Prevention |
|-------|-----------|
| `node_modules` committed to git | Use `node_modules` (no leading `/`) in `.gitignore` |
| Supabase port 6543 unreachable locally | Use port 5432 for CLI, 6543 for serverless |
| "prepared statement does not exist" | Add `?pgbouncer=true` to connection string |
| Password special chars break URL | URL-encode before putting in connection string |
| OAuth redirect URI mismatch | Register full callback URL including `/api/auth/callback/[provider]` |
| Prisma 7 url/directUrl error | Move connection URLs to `prisma.config.ts`, not schema.prisma |
| Prisma version mismatch | Pin major version, check compatibility with framework |
| Edge runtime crypto error | Split auth config — use auth.config.ts (edge-safe) for middleware |
| PgBouncer + pg adapter timeout | Use DIRECT_URL (port 5432) for pg adapter, max pool size 2 in prod |
| Max connections exceeded on Vercel | Reduce pg pool to max: 2 per serverless function |
| Chart hover shows light background | Add `cursor={false}` to Recharts Tooltip |
| Recharts crashes dev server | Lazy-load with `next/dynamic` and `ssr: false` |
| Legend overlaps chart on mobile | Use `verticalAlign="bottom"` with padding |
| Build fails on Vercel but works locally | Check env vars are set, check root directory setting |
| CSS breaks after file edits | Clear `.next` cache and restart dev server |
| git push hangs in Kiro terminal | Push via VS Code Source Control panel → "..." → Push |

---

## Data Sources (current)



---

## Pending / V2 Features


