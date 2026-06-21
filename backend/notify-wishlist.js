require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

function formatPrice(cents, currency) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}${currency ? " " + currency : ""}`;
}

async function loadTriggeredItems() {
  const { data: items, error: itemsError } = await supabase
    .from("wishlist_items")
    .select("id, user_id, target_price_cents, baseline_price_cents, last_notified_price_cents, games(id, title, appid)")
    .eq("notifications_enabled", true);

  if (itemsError) throw new Error(`Failed to load wishlist_items: ${itemsError.message}`);
  if (!items || items.length === 0) return [];

  const gameIds = [...new Set(items.map((i) => i.games.id))];

  const { data: prices, error: pricesError } = await supabase
    .from("latest_prices")
    .select("game_id, price_cents, currency")
    .in("game_id", gameIds);

  if (pricesError) throw new Error(`Failed to load latest_prices: ${pricesError.message}`);

  const priceByGame = new Map(prices.map((p) => [p.game_id, p]));

  const triggered = [];

  for (const item of items) {
    const price = priceByGame.get(item.games.id);
    if (!price) continue; // no snapshot yet for this game — nothing to compare against

    const current = price.price_cents;

    let qualifies = false;
    if (item.target_price_cents != null) {
      qualifies = current <= item.target_price_cents;
    } else if (item.baseline_price_cents != null) {
      qualifies = current < item.baseline_price_cents;
    }
    // If neither target nor baseline is set, we have nothing to compare
    // against yet (e.g. baseline was null because no snapshot existed
    // when they wishlisted) — skip until a baseline exists.

    if (!qualifies) continue;

    // Suppress re-notification unless price has dropped further than
    // what we already emailed them about.
    const alreadyNotifiedAtThisPrice =
      item.last_notified_price_cents != null && current >= item.last_notified_price_cents;
    if (alreadyNotifiedAtThisPrice) continue;

    triggered.push({
      wishlistItemId: item.id,
      userId: item.user_id,
      gameTitle: item.games.title,
      appid: item.games.appid,
      currentPriceCents: current,
      currency: price.currency,
    });
  }

  return triggered;
}

async function sendNotificationEmail(email, items) {
  const lines = items
    .map(
      (i) =>
        `- ${i.gameTitle}: now ${formatPrice(i.currentPriceCents, i.currency)} (https://store.steampowered.com/app/${i.appid})`,
    )
    .join("\n");

  await resend.emails.send({
    from: "noreply@updates.zlima.dev",
    to: email,
    subject: `Price drop on ${items.length} wishlisted game${items.length > 1 ? "s" : ""}`,
    text: `Good news — prices dropped on games you're tracking:\n\n${lines}\n\nHappy shopping!`,
  });
}

async function main() {
  const triggered = await loadTriggeredItems();
  console.log(`${triggered.length} wishlist item(s) qualify for notification.`);

  if (triggered.length === 0) return;

  // Group by user so someone with multiple drops gets one email, not several.
  const byUser = new Map();
  for (const item of triggered) {
    if (!byUser.has(item.userId)) byUser.set(item.userId, []);
    byUser.get(item.userId).push(item);
  }

  let sent = 0;
  let failed = 0;

  for (const [userId, items] of byUser) {
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !userData?.user?.email) {
        throw new Error(userError?.message ?? "No email on user record");
      }

      await sendNotificationEmail(userData.user.email, items);

      // Mark each item as notified at its current price so we don't
      // re-send unless it drops further.
      for (const item of items) {
        const { error: updateError } = await supabase
          .from("wishlist_items")
          .update({ last_notified_price_cents: item.currentPriceCents })
          .eq("id", item.wishlistItemId);

        if (updateError) {
          console.error(`Failed to update last_notified for ${item.wishlistItemId}: ${updateError.message}`);
        }
      }

      sent++;
    } catch (err) {
      console.error(`FAILED to notify user ${userId}: ${err.message}`);
      failed++;
    }
  }

  console.log(`Notified ${sent} user(s), ${failed} failure(s).`);

  if (sent === 0 && failed > 0) {
    throw new Error("All notification attempts failed.");
  }
}

main().catch((err) => {
  console.error("Notification run failed:", err.message);
  process.exit(1);
});