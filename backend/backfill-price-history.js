require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const BACKFILL_DAYS = 14;

// Steam sales almost always land on round numbers. Picking from this set
// instead of a random float makes the synthesized history look like real
// storefront pricing rather than noise.
const SALE_DISCOUNT_PERCENTS = [10, 20, 25, 33, 40, 50, 60, 75];

// Roughly 1 in N days has a sale-style dip. Tune this to taste — lower
// means more frequent dips, higher means a flatter, more boring chart.
const SALE_CHANCE_DENOMINATOR = 5;

// Below this many real snapshots, a game's chart still looks broken —
// PriceChart.tsx needs 2+ points to render a line at all, and 1-2 points
// doesn't look like real history yet. Games AT or ABOVE this count are
// assumed to already have a real, growing history from the cron and are
// left alone; games BELOW it get backfilled up to BACKFILL_DAYS.
//
// This matters because a naive "has any snapshot" check (the original
// version of this script) treats a game with exactly 1 real snapshot as
// "already has history" and skips it forever — leaving its chart stuck
// on the "not enough data" empty state even after running this script.
const MIN_SNAPSHOTS_TO_SKIP = 3;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickDiscountPercent() {
  return SALE_DISCOUNT_PERCENTS[randomInt(0, SALE_DISCOUNT_PERCENTS.length - 1)];
}

// Walks backward day-by-day from `currentPriceCents`, the known real price,
// synthesizing what the preceding days plausibly looked like. Free games
// stay free the whole way — there's no "discount" to simulate on $0.
function synthesizeHistory(currentPriceCents, currency, days) {
  if (currentPriceCents === 0) {
    return Array.from({ length: days }, () => ({
      price_cents: 0,
      currency: null,
      discount_percent: 0,
    }));
  }

  // currentPriceCents is the *final* (possibly already-discounted) price.
  // We don't actually know the game's true undiscounted price from a single
  // snapshot, so we treat today's price as the baseline "normal" price and
  // simulate dips below it — this keeps the most recent (real) data point
  // consistent with what the chart shows for "today."
  const basePriceCents = currentPriceCents;

  const history = [];
  let cursor = basePriceCents;

  for (let i = 0; i < days; i++) {
    const onSale = randomInt(1, SALE_CHANCE_DENOMINATOR) === 1;

    if (onSale) {
      const discountPercent = pickDiscountPercent();
      cursor = Math.round(basePriceCents * (1 - discountPercent / 100));
      history.push({ price_cents: cursor, currency, discount_percent: discountPercent });
    } else {
      // Off-sale days sit at the base price. Real Steam pricing is mostly
      // flat punctuated by sale windows, not a smooth random walk.
      cursor = basePriceCents;
      history.push({ price_cents: cursor, currency, discount_percent: 0 });
    }
  }

  return history; // history[0] = oldest synthesized day, history[last] = most recent
}

async function getGamesNeedingBackfill() {
  const { data: games, error: gamesError } = await supabase.from("games").select("id, title, appid");
  if (gamesError) throw new Error(`Failed to load games: ${gamesError.message}`);

  // Count snapshots per game rather than just checking existence, so a
  // game with only 1-2 real points (e.g. from earlier manual scrape runs)
  // still gets backfilled instead of being permanently skipped.
  const { data: existing, error: existingError } = await supabase.from("price_snapshots").select("game_id");
  if (existingError) throw new Error(`Failed to check existing snapshots: ${existingError.message}`);

  const countByGame = new Map();
  for (const s of existing ?? []) {
    countByGame.set(s.game_id, (countByGame.get(s.game_id) ?? 0) + 1);
  }

  return games
    .filter((g) => (countByGame.get(g.id) ?? 0) < MIN_SNAPSHOTS_TO_SKIP)
    .map((g) => ({ ...g, existingCount: countByGame.get(g.id) ?? 0 }));
}

async function getLatestPrice(gameId) {
  // latest_prices is the same view your frontend already reads from
  // (see app/page.tsx) — reusing it keeps "current price" consistent
  // between the backfill and what users see in the UI.
  const { data, error } = await supabase
    .from("latest_prices")
    .select("price_cents, currency")
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data; // null if this game has no real snapshot yet
}

async function main() {
  const games = await getGamesNeedingBackfill();

  if (games.length === 0) {
    console.log(`No games need backfilling — all games already have ${MIN_SNAPSHOTS_TO_SKIP}+ snapshots.`);
    return;
  }

  console.log(
    `Backfilling history for ${games.length} game(s) with fewer than ${MIN_SNAPSHOTS_TO_SKIP} real snapshots...`,
  );

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const game of games) {
    try {
      const latest = await getLatestPrice(game.id);

      if (!latest) {
        // No real price yet for this game — nothing to anchor a backfill
        // to. Run scrape-and-store.js for this game first.
        console.log(`SKIPPED ${game.title}: no current price snapshot to anchor to`);
        skipped++;
        continue;
      }

      // If this game already has 1-2 real snapshots, don't backfill the
      // full BACKFILL_DAYS on top of them — that would create duplicate
      // dates. Just fill in the gap so the total reaches BACKFILL_DAYS.
      const daysToBackfill = Math.max(0, BACKFILL_DAYS - game.existingCount);
      if (daysToBackfill === 0) {
        skipped++;
        continue;
      }

      const history = synthesizeHistory(latest.price_cents, latest.currency, daysToBackfill);

      const now = Date.now();
      const rows = history.map((snapshot, i) => {
        // i=0 is the oldest synthesized point. daysAgo counts down,
        // leaving room for the game's existing real snapshot(s) to occupy
        // the most recent day(s) without us overwriting or duplicating them.
        const daysAgo = daysToBackfill - i + game.existingCount;
        const scrapedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

        return {
          game_id: game.id,
          price_cents: snapshot.price_cents,
          currency: snapshot.currency,
          discount_percent: snapshot.discount_percent,
          scraped_at: scrapedAt.toISOString(),
        };
      });

      const { error: insertError } = await supabase.from("price_snapshots").insert(rows);
      if (insertError) throw new Error(insertError.message);

      console.log(`OK ${game.title}: ${rows.length} synthesized snapshots added (had ${game.existingCount} real)`);
      succeeded++;
    } catch (err) {
      console.error(`FAILED ${game.title}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${succeeded} backfilled, ${skipped} skipped, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Backfill run failed:", err.message);
  process.exit(1);
});
