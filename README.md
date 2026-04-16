# team1 Member Portal

Next.js 15 + Prisma + Postgres (Neon) + NextAuth (Google).
Lives at `member.team1.network`.

## What's in the portal

**Auth**
- Google sign-in only (X/Twitter is a display field, never an auth provider).
- `@team1.network` emails are auto-whitelisted and land in the **Global** region as members.
- All other emails must exist in the Member Roster (managed by admins) or be manually added.
- 15-min access JWT + 30-day refresh token, capped at 10 concurrent sessions per user.

**Regions & membership**
- One member can belong to multiple regions. Each region membership has a role: `member`, `co_lead`, or `lead`.
- "Global" region exists as the default when we don't know someone's country yet.

**Member profile**
- Full profile with country, socials (Discord, X, GitHub, Telegram, Instagram, Farcaster, TikTok, Twitch, YouTube, Linktree, etc.), skills, interests, languages, availability, cohort, merch sizes (unisex + womens × tshirt/hoodie/pants), C-Chain address, development goals, shipping address.
- **Per-field privacy**: each field can be `public` / `members only` / `leads only`. Enforced server-side.
- **Profile-completion banner**: shows at the top of every page until required fields (`displayName`, `country`, `discord`, `xHandle`) are filled.

**Admin-only profile fields**
- `status` enum: `active` / `flagged` / `paused` / `inactive` / `removed`.
- `adminNotes` (admin-only free text).
- `cohort`, `inRegionalTg` — leads or admins can set these.

**Roles (self-serve requests)**
- Members can request a role (e.g. "Discord Moderator", "Workshop Organizer").
- Admins approve or reject. On approval the role is appended to the member's profile.
- Both the member and the admins get Notifications at each step.

**Activities**
- Members log their own activities (events, PRs, content, etc.).
- Activities have `source` (`manual`, `discord-bot`, …), `visibility` (0 admin / 1 leads+admin / 2 members / 3 public), and `includeInReport` flags.
- Region leads get an admin view of their region members' activities via `/api/admin/activities`.
- Discord bot can write activities through an authenticated webhook: `POST /api/webhooks/discord/activity`.

**Audit log**
- Every meaningful change (profile, memberships, roles, activities, applications, roster, leads, regions, playbooks) writes an `AuditLog` row with `previousValue` / `newValue` JSON diffs.
- Admin UI at `/admin/audit` supports filtering by module or member id and expanding a row to see the before/after side-by-side.

**Admin surfaces** (at `/admin/*`)
- All Members — grouped one row per user with all their regions (up to 3 + "+N" overflow).
- Member Roster (whitelist), Country Leads, Regions, Applications, Audit Log.

## Local setup

Prereqs: **Node 20+**, **pnpm**, a Neon (or any Postgres) database, a Google OAuth client.

```bash
git clone <this-repo>
cd member.team1.network
pnpm install
cp .env.example .env           # then fill in DATABASE_URL, Google creds, secrets
pnpm db:push                   # create tables
pnpm db:generate               # regenerate Prisma client
pnpm db:seed                   # seed 2 super admins + regions
pnpm dev                       # http://localhost:3000
```

### Google OAuth (required for login)

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** (type: Web app):

| Field | Value |
|---|---|
| Authorized JavaScript origin | `http://localhost:3000` |
| Authorized redirect URI | `http://localhost:3000/api/auth/callback/google` |

Paste the client id + secret into `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, then generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

### Seeded super admins

After `pnpm db:seed` these two accounts have super-admin access:
- `sarnavo@team1.network`
- `abhishektripathi8774@gmail.com`

Any other `@team1.network` email can sign in and will auto-land in the Global region as a member.

## Useful scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Next dev server on :3000 |
| `pnpm build && pnpm start` | Production build + serve |
| `pnpm db:push` | Sync Prisma schema to the database (no migrations folder) |
| `pnpm db:generate` | Regenerate the Prisma client after schema edits |
| `pnpm db:seed` | Wipe + reseed regions, 2 super admins, roster |
| `pnpm db:studio` | Open Prisma Studio to browse the DB |

## Deploy

Set the same env vars in Vercel, plus flip `NEXTAUTH_URL` + `NEXT_PUBLIC_APP_URL` to the production origin (e.g. `https://member.team1.network`). Add the production origin + `/api/auth/callback/google` as a second entry in the Google OAuth client before switching the domain.
