const axios = require("axios");
const fs = require("fs");

// - top100in2weeks: most-played in the last two weeks (keeps the list fresh)
// - top100forever:  most-played all-time (keeps in well-known classics)
const STEAMSPY_URL = "https://steamspy.com/api.php";
const REQUESTS = ["top100in2weeks", "top100forever"];

const REQUEST_DELAY_MS = 1100;

async function fetchSteamSpyList(request) {
  const response = await axios.get(STEAMSPY_URL, {
    params: { request },
    timeout: 15000,
    headers: { "User-Agent": "g2a-webscraper/1.0 (personal project)" },
  });

  // SteamSpy returns an object keyed by appid, not an array — normalize it.
  const data = response.data;
  if (!data || typeof data !== "object") {
    throw new Error(`SteamSpy "${request}" returned an unexpected payload shape`);
  }

  return Object.values(data);
}

async function fetchTopSellers() {
  const allItems = [];

  for (const request of REQUESTS) {
    try {
      const items = await fetchSteamSpyList(request);
      console.log(`  ${request}: ${items.length} games`);
      allItems.push(...items);
    } catch (err) {
      console.error(`  ${request} FAILED: ${err.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
  }

  if (allItems.length === 0) {
    throw new Error("No items found from any SteamSpy endpoint — API may be down or shape changed");
  }

  // Dedupe and normalize field names, same contract as before: {appid, title}.
  const seen = new Set();
  const games = [];

  for (const item of allItems) {
    const appid = item.appid;
    const title = item.name;
    if (!appid || !title) continue; // skip malformed entries rather than crash
    const appidStr = String(appid);
    if (seen.has(appidStr)) continue;
    seen.add(appidStr);
    games.push({ appid: appidStr, title });
  }

  return games;
}

async function main() {
  console.log("Fetching game lists from SteamSpy...");
  const games = await fetchTopSellers();

  console.log(`\nFetched ${games.length} unique games.`);
  console.log(games.slice(0, 5)); // sanity check first few

  fs.writeFileSync("top-sellers.json", JSON.stringify(games, null, 2));
  console.log("Saved to top-sellers.json");
}

main().catch((err) => {
  console.error("Failed to fetch top sellers:", err.message);
  process.exit(1);
});
