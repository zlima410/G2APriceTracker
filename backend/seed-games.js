require("dotenv").config();
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  if (!fs.existsSync("top-sellers.json")) {
    throw new Error("top-sellers.json not found - run fetch-top-sellers.js first");
  }

  const games = JSON.parse(fs.readFileSync("top-sellers.json", "utf-8"));

  const rows = games.map((g) => ({
    appid: g.appid,
    title: g.title,
  }));

  const { data, error } = await supabase.from("games").upsert(rows, { onConflict: "appid" }).select();

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  console.log(`Upserted ${data.length} games into the games table.`);
}

main().catch((err) => {
  console.error("Seeding failed: ", err.message);
  process.exit(1);
});
