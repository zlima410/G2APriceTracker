"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

type WishlistItem = {
  id: string;
  target_price_cents: number | null;
  baseline_price_cents: number | null;
};

export default function WishlistButton({
  gameId,
  latestPriceCents,
}: {
  gameId: string;
  latestPriceCents: number | null;
}) {
  const { session, loading: authLoading } = useAuth();
  const [item, setItem] = useState<WishlistItem | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      setLoading(false);
      return;
    }

    async function load() {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, target_price_cents, baseline_price_cents")
        .eq("user_id", session!.user.id)
        .eq("game_id", gameId)
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else if (data) {
        setItem(data);
        setTargetPrice(data.target_price_cents != null ? (data.target_price_cents / 100).toString() : "");
      }
      setLoading(false);
    }

    load();
  }, [session, authLoading, gameId]);

  async function handleAdd() {
    if (!session) return;
    setError(null);

    const targetCents = targetPrice ? Math.round(parseFloat(targetPrice) * 100) : null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wishlist_items")
      .insert({
        user_id: session.user.id,
        game_id: gameId,
        target_price_cents: targetCents,
        baseline_price_cents: latestPriceCents,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setItem(data);
  }

  async function handleRemove() {
    if (!item) return;
    setError(null);

    const supabase = await createClient();
    const { error } = await supabase.from("wishlist_items").delete().eq("id", item.id);

    if (error) {
      setError(error.message);
      return;
    }

    setItem(null);
    setTargetPrice("");
  }

  if (authLoading || loading) return null;

  if (!session) {
    return (
      <p className="text-sm text-gray-600">
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>{" "}
        to add this game to your wishlist.
      </p>
    );
  }

  return (
    <div className="border rounded p-4 max-w-sm">
      {item ? (
        <>
          <p className="text-sm mb-2">
            On your wishlist
            {item.target_price_cents != null
              ? ` — notify below $${(item.target_price_cents / 100).toFixed(2)}`
              : " — notify on any price drop"}
          </p>
          <button onClick={handleRemove} className="text-sm text-red-600 hover:underline">
            Remove from wishlist
          </button>
        </>
      ) : (
        <>
          <label className="text-sm block mb-2">Notify me when price drops below:</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 9.99"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="border rounded px-2 py-1 w-28 text-sm"
            />
            <button onClick={handleAdd} className="bg-black text-white rounded px-3 py-1 text-sm">
              Add to wishlist
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Leave blank to get notified on any price drop.</p>
        </>
      )}

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
