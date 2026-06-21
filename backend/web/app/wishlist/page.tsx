"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

type WishlistRow = {
  id: string;
  target_price_cents: number | null;
  games: {
    id: string;
    appid: string;
    title: string;
  };
};

type LatestPrice = { price_cents: number; currency: string | null };

function formatPrice(cents: number | null, currency: string | null) {
  if (cents === null) return "—";
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)} ${currency ?? ""}`.trim();
}

export default function WishlistPage() {
  const { session, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistRow[]>([]);
  const [prices, setPrices] = useState<Record<string, LatestPrice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setLoading(false);
      return;
    }

    async function load() {
      const supabase = createClient();
      const { data: wishlistRows, error: wishlistError } = await supabase
        .from("wishlist_items")
        .select("id, target_price_cents, games(id, appid, title)")
        .eq("user_id", session!.user.id);

      if (wishlistError) {
        setError(wishlistError.message);
        setLoading(false);
        return;
      }

      const rows = (wishlistRows ?? []) as unknown as WishlistRow[];
      setItems(rows);

      if (rows.length > 0) {
        const gameIds = rows.map((r) => r.games.id);
        const { data: snapshotRows } = await supabase
          .from("latest_prices")
          .select("game_id, price_cents, currency")
          .in("game_id", gameIds);

        const latest: Record<string, LatestPrice> = {};
        for (const snap of snapshotRows ?? []) {
          latest[snap.game_id] = { price_cents: snap.price_cents, currency: snap.currency };
        }
        setPrices(latest);
      }

      setLoading(false);
    }

    load();
  }, [session, authLoading]);

  async function handleRemove(id: string) {
    const supabase = await createClient();
    await supabase.from("wishlist_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (authLoading || loading) {
    return <main className="max-w-3xl mx-auto p-8">Loading…</main>;
  }

  if (!session) {
    return (
      <main className="max-w-3xl mx-auto p-8">
        <p>
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>{" "}
          to see your wishlist.
        </p>
      </main>
    );
  }

  if (error) {
    return <main className="max-w-3xl mx-auto p-8 text-red-600">Couldn&apos;t load your wishlist: {error}</main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">My Wishlist</h1>

      {items.length === 0 ? (
        <p className="text-gray-500">
          Nothing here yet —{" "}
          <Link href="/" className="text-blue-600 hover:underline">
            browse games
          </Link>{" "}
          to add some.
        </p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => {
            const latest = prices[item.games.id];
            return (
              <li key={item.id} className="py-3 flex justify-between items-center">
                <div>
                  <Link href={`/games/${item.games.appid}`} className="hover:underline">
                    {item.games.title}
                  </Link>
                  {item.target_price_cents != null && (
                    <p className="text-xs text-gray-500">Notify below ${(item.target_price_cents / 100).toFixed(2)}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-700">
                    {formatPrice(latest?.price_cents ?? null, latest?.currency ?? null)}
                  </span>
                  <button onClick={() => handleRemove(item.id)} className="text-sm text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}