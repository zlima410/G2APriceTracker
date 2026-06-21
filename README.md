# Game Signal
 
Track Steam game prices over time, build a wishlist, and get emailed the moment something drops below your target — built PCPartPicker-style, end to end on free tiers.
 
**Live:** deployed on Vercel · **Status:** MVP complete, data accumulating
 
## What it does
 
- **Browse** a catalog of tracked Steam games with current prices and search.
- **Price history charts** with 7D / 30D / 90D / All toggles.
- **Sign in** and build a personal wishlist.
- **Opt in** to email alerts per game — either on *any* price drop, or only below a target price you set.
- Everything updates automatically: a scheduled job re-scrapes prices and emails qualifying wishlist matches, with no server to maintain.
## Tech stack
 
| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind, on Vercel |
| Database + Auth | Supabase (Postgres + built-in Auth, Row Level Security) |
| Scraper / notifier runtime | Node.js scripts, no server — run on a schedule |
| Scheduling | GitHub Actions cron |
| Email | Resend |
| Price source | Steam Storefront API (`store.steampowered.com/api/appdetails`) |
| Game discovery | SteamSpy API (`steamspy.com/api.php`) |
| Charts | Recharts |
 
## Repo structure
 
```
.github/workflows/scrape.yml     # daily cron: scrape prices → check wishlists → notify
backend/
  fetch-top-sellers.js           # pulls a starter game list from SteamSpy
  seed-games.js                  # upserts that list into the `games` table
  scrape-and-store.js            # fetches current price for every tracked game, writes a snapshot
  notify-wishlist.js             # checks opted-in wishlist items against latest prices, emails on qualifying drops
  package.json
  web/                           # Next.js frontend, deployed separately to Vercel
    app/                         # routes: / (browse), /games/[appid], /login, /wishlist
    components/
    lib/
```
 
## Database schema (Supabase / Postgres)
 
| Table / view | Purpose |
|---|---|
| `games` | `id`, `appid`, `title` |
| `price_snapshots` | `game_id`, `price_cents`, `currency`, `discount_percent`, `scraped_at` — one row per scrape |
| `latest_prices` (view) | One row per game: its most recent snapshot. Keeps frontend reads cheap regardless of how much history accumulates |
| `wishlist_items` | `user_id`, `game_id`, `target_price_cents` (nullable), `baseline_price_cents`, `notifications_enabled`, `last_notified_price_cents` |
 
**Row Level Security:** `games` and `price_snapshots` are public read-only. `wishlist_items` is scoped per-user — a user can only see and modify their own rows. The scraper and notifier use the `service_role` key, which bypasses RLS by design; that key is only ever stored in GitHub Actions secrets, never in the frontend.
 
## Notification logic
 
- **Target price set** → notify when current price ≤ target.
- **No target set** → notify on any drop below the price recorded the moment the game was wishlisted (`baseline_price_cents`).
- **Re-notification suppression** — won't email again for the same item unless the price drops *further* than what was last reported (`last_notified_price_cents`).
- **Opt-in by default off** — notifications must be explicitly enabled per wishlist item; nothing is emailed unless the user turns it on.
## Environment variables
 
**`backend/.env`** (local only — production values live in GitHub Actions secrets, never committed)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=        # service_role key — bypasses RLS, server-side only
RESEND_API_KEY=
```
 
**`backend/web/.env.local`** (and the matching Vercel project environment variables)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # public anon key — safe to expose; RLS enforces access
```
 
## Running the scraper locally
 
```bash
cd backend
npm install
node fetch-top-sellers.js   # -> top-sellers.json (pulled from SteamSpy)
node seed-games.js          # upsert into `games`
node scrape-and-store.js    # write a price snapshot for every tracked game
node notify-wishlist.js     # check wishlists, email on qualifying drops
```
 
## Running the frontend locally
 
```bash
cd backend/web
npm install
npm run dev
```
 
## Automation
 
A single GitHub Actions workflow (`.github/workflows/scrape.yml`) runs daily and supports manual dispatch from the Actions tab. Each run:
 
1. Scrapes a fresh price for every tracked game.
2. Checks every opted-in wishlist item against the new prices.
3. Emails users whose conditions are met.
One bad game or one failed email never aborts the whole run — failures are logged and counted, and the job only fails loudly (red ✗ in Actions) if the overall failure rate crosses a threshold, so silent breakage doesn't go unnoticed.
 
**Required repo secrets:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`.
 
## Deployment
 
- **Frontend:** Vercel Hobby tier, project root set to `backend/web`.
- **Scraper / notifier:** GitHub Actions cron — free compute, no server to maintain.
- **Database / Auth:** Supabase free tier.
- **Email:** Resend free tier.
All four free tiers used here cap usage rather than overage-bill, so the project runs at $0 as long as nothing is manually upgraded to a paid plan.
 
## Known limitations
 
- Steam's Storefront API has no official rate-limit documentation; the scraper adds a small delay between requests as a precaution rather than a guarantee.
- Prices reflect the US storefront (`cc=us`) only; no multi-region support yet.
- Not affiliated with Valve, Steam, G2A, or SteamSpy.

## Post-MVP ideas
 
- All-time low/high badges on game pages
- Percent price-drop indicator on browse/wishlist
- "Demo mode" with seeded data for presentations independent of live scrape state
- Scraper health alerting (notify on a run that returns zero results)
- SEO-friendly public game pages
