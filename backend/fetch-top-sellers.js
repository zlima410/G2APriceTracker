const axios = require("axios");
const fs = require("fs");

const FEATURED_URL = "https://store.steampowered.com/api/featuredcategories";

async function fetchTopSellers() {
  const response = await axios.get(FEATURED_URL, {
    params: { cc: "us", l: "en" },
    timeout: 10000,
  });

  // Merge several categories instead of just top_sellers — each is a
  // short curated list (~15-50 items), but combined they give a much
  // larger, still-legitimate starter set without scraping or pagination.
  const categories = ["top_sellers", "new_releases", "specials", "coming_soon"];
  const allItems = categories.flatMap((key) => response.data?.[key]?.items ?? []);

  if (allItems.length === 0) {
    throw new Error("No items found in any category — endpoint shape may have changed");
  }

  // Dedup just in case, and normalize the field names now so nothing
  // downstream (DB insert, scraper) has to know about Steam's raw shape.
  const seen = new Set();
  const games = [];

  for (const item of allItems) {
    if (!item.id || !item.name) continue; // skip malformed entries rather than crash
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    games.push({ appid: String(item.id), title: item.name });
  }

  return games;
}

async function main() {
  const games = await fetchTopSellers();

  console.log(`Fetched ${games.length} top-seller games.`);
  console.log(games.slice(0, 5)); // sanity check first few

  fs.writeFileSync("top-sellers.json", JSON.stringify(games, null, 2));
  console.log("Saved to top-sellers.json");
}

main().catch((err) => {
  console.error("Failed to fetch top sellers:", err.message);
  process.exit(1);
});