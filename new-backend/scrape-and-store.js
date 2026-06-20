require("dotenv").config();
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const STEAM_API_BASEURL = "https://store.steampowered.com/api/appdetails";

async function scrapeGame(appid) {
  const response = await axios.get(STEAM_API_BASEURL, {
    params: { appids: appid, cc: "us", 1: "en" },
    timeout: 10000,
  });

  const entry = response.data?.[appid];
  if (!entry || entry.success !== true) {
    throw new Error(`Steam returned no usable data for appid ${appid}`);
  }

  const data = entry.data;

  if (data.is_free || !data.price_overview) {
    return { priceCents: 0, currency: null, discountPercent: 0 };
  }

  const p = data.price_overview;
  return {
    priceCents: p.final,
    currency: p.currency,
    discountPercent: p.discount_percent,
  };
}

async function main() {
  const { data: games, error } = await supabase.from("games").select("id, appid, title");

  if (error) throw new Error(`Failed to load games: ${error.message}`);

  console.log(`Scraping ${games.length} games...`);

  let succeeded = 0;
  let failed = 0;

  for (const game of games) {
    try {
        const { priceCents, currency, discountPercent } = await scrapeGame(game.appid);

        const { error: insertError } = await supabase
          .from('price_snapshots')
          .insert({
            game_id: game.id,
            price_cents: priceCents,
            currency,
            discount_percent: discountPercent,
          });

        if (insertError) throw new Error(insertError.message);

        succeeded++;
    } catch (err) {
        console.error(`FAILED ${game.title} (appid ${game.appid}): ${err.mesage}`);
        failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);

  if (succeeded === 0 && games.length > 0) {
    throw new Error("Every game failed to scrape — treating run as failed.");
  }

  const failureRate = failed / games.length;
  if (failureRate > 0.5) {
    throw new Error(`Failure rate too high (${failed}/${games.length}) — treating run as failed.`);
  }
}

main().catch((err) => {
    console.error('Scrape run failed: ', err.message);
    process.exit(1);
})
