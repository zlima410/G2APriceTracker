const axios = require("axios");
const fs = require("fs");

const FEATURED_URL = "https://store.steampowered.com/api/featuredcategories";

async function fetchTopSellers() {
  const response = await axios.get(FEATURED_URL, {
    params: { cc: "us", l: "en" },
    timeout: 10000,
  });

  const topSellers = response.data?.top_sellers?.items;

  if (!topSellers || !Array.isArray(topSellers)) {
    throw new Error("top_sellers.items missing from response - end point shape may have changed");
  }

  const seen = new Set();
  const games = [];

  for (const item of topSellers) {
    if (!item.id || !item.name) continue;

    if (seen.has(item.id)) continue;
    seen.add(item.id);
    games.push({ appid: String(item.id), title: item.name });
  }

  return games;
}

async function main() {
  const games = await fetchTopSellers();

  console.log(`Fetched ${games.length} top-seller games.`);
  console.log(games.slice(0, 5));

  fs.writeFileSync("top-sellers.json", JSON.stringify(games, null, 2));
  console.log("Saved to top-sellers.json");
}

main().catch((err) => {
  console.error("Failed to fetch top sellers: ", err.message);
  process.exit(1);
});
