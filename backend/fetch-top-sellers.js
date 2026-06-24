const axios = require("axios");
const fs = require("fs");
const { sleep, getWithRetry } = require("./request-utils");

const STEAMSPY_URL = "https://steamspy.com/api.php";
const STEAM_FEATURED_URL = "https://store.steampowered.com/api/featuredcategories";

const STEAMSPY_TOP_LISTS = ["top100in2weeks", "top100forever", "top100owned"];

const STEAMSPY_TAGS = ["Action", "Indie", "RPG", "Strategy", "Adventure", "Simulation", "Sports", "Racing"];
const TAG_SAMPLE_SIZE = 60;

const MAX_GAMES = 300;

// Bumped from 1100ms — SteamSpy's free API has no official rate limit
// documentation, but is known to start returning 429s under sustained
// rapid requests. Override via env var if you need to tune without
// editing code.
const REQUEST_DELAY_MS = Number(process.env.STEAMSPY_DELAY_MS) || 2000;

async function fetchSteamSpyList(params) {
  const response = await getWithRetry(axios, STEAMSPY_URL, {
    params,
    timeout: 15000,
    headers: { "User-Agent": "g2a-webscraper/1.0 (personal project)" },
  });

  const data = response.data;
  if (!data || typeof data !== "object") {
    throw new Error(`SteamSpy request ${JSON.stringify(params)} returned an unexpected payload shape`);
  }

  return Object.values(data);
}

async function fetchSteamSpecials() {
  const response = await getWithRetry(axios, STEAM_FEATURED_URL, {
    params: { cc: "us", l: "en" },
    timeout: 15000,
  });

  const items = response.data?.specials?.items ?? [];
  return items.map((item) => ({ appid: item.id, name: item.name }));
}

async function fetchAllSources() {
  const allItems = [];

  try {
    const specials = await fetchSteamSpecials();
    console.log(`  steam specials: ${specials.length} games`);
    allItems.push(...specials);
  } catch (err) {
    console.error(`  steam specials FAILED: ${err.message}`);
  }

  await sleep(REQUEST_DELAY_MS);

  for (const request of STEAMSPY_TOP_LISTS) {
    try {
      const items = await fetchSteamSpyList({ request });
      console.log(`  ${request}: ${items.length} games`);
      allItems.push(...items);
    } catch (err) {
      console.error(`  ${request} FAILED: ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  for (const tag of STEAMSPY_TAGS) {
    try {
      const items = await fetchSteamSpyList({ request: "tag", tag });
      const sample = items.slice(0, TAG_SAMPLE_SIZE);
      console.log(`  tag "${tag}": ${items.length} available, took ${sample.length}`);
      allItems.push(...sample);
    } catch (err) {
      console.error(`  tag "${tag}" FAILED: ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (allItems.length === 0) {
    throw new Error("No items found from any source — APIs may be down or response shape changed");
  }

  const seen = new Set();
  const games = [];

  for (const item of allItems) {
    const appid = item.appid;
    const title = item.name;
    if (!appid || !title) continue;
    const appidStr = String(appid);
    if (seen.has(appidStr)) continue;
    seen.add(appidStr);
    games.push({ appid: appidStr, title });
  }

  return games.slice(0, MAX_GAMES);
}

async function main() {
  console.log(`Fetching game lists from SteamSpy + Steam specials (delay: ${REQUEST_DELAY_MS}ms)...`);
  const games = await fetchAllSources();

  console.log(`\nFetched ${games.length} unique games (capped at ${MAX_GAMES}).`);
  console.log(games.slice(0, 5));

  fs.writeFileSync("top-sellers.json", JSON.stringify(games, null, 2));
  console.log("Saved to top-sellers.json");
}

main().catch((err) => {
  console.error("Failed to fetch top sellers:", err.message);
  process.exit(1);
});