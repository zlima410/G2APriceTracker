"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, HeartOff, Bell, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import Switch from "@/components/Switch";

type WishlistItem = {
  id: string;
  target_price_cents: number | null;
  baseline_price_cents: number | null;
  notifications_enabled: boolean;
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
  // Opt-in, not opt-out: notifications start unchecked. The person has
  // to actively decide they want emails, rather than us deciding for them.
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
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
        .select("id, target_price_cents, baseline_price_cents, notifications_enabled")
        .eq("user_id", session!.user.id)
        .eq("game_id", gameId)
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else if (data) {
        setItem(data);
        setTargetPrice(data.target_price_cents != null ? (data.target_price_cents / 100).toString() : "");
        setNotificationsEnabled(data.notifications_enabled);
      }
      setLoading(false);
    }

    load();
  }, [session, authLoading, gameId]);

  async function handleAdd() {
    if (!session) return;
    setError(null);

    const supabase = await createClient();

    const targetCents = notificationsEnabled && targetPrice ? Math.round(parseFloat(targetPrice) * 100) : null;

    const { data, error } = await supabase
      .from("wishlist_items")
      .insert({
        user_id: session.user.id,
        game_id: gameId,
        target_price_cents: targetCents,
        baseline_price_cents: latestPriceCents,
        notifications_enabled: notificationsEnabled,
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
    setNotificationsEnabled(false);
  }

  if (authLoading || loading) {
    return <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Heart className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Sign in to track this game and get price-drop alerts.</p>
        </div>
        <Link
          href="/login"
          className="inline-flex flex-none items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (item) {
    return (
      <div className="rounded-xl border border-primary/30 bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">On your wishlist</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.notifications_enabled
                  ? item.target_price_cents != null
                    ? `We'll email you when it drops below $${(item.target_price_cents / 100).toFixed(2)}.`
                    : "We'll email you on any price drop."
                  : "Email notifications are off for this game."}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-up/40 hover:text-up"
          >
            <HeartOff className="h-4 w-4" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-up">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-muted text-primary">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium">Email me about price drops</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Get notified the moment this game goes on sale.</p>
          </div>
        </div>
        <Switch
          checked={notificationsEnabled}
          onChange={setNotificationsEnabled}
          label="Enable email notifications"
        />
      </div>

      {notificationsEnabled && (
        <div className="mt-4 border-t border-border pt-4">
          <label htmlFor="target-price" className="block text-sm font-medium">
            Notify me when the price drops below
          </label>
          <div className="mt-2 flex items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <input
                id="target-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="9.99"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-32 rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm font-mono tabular-nums outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <span className="text-xs text-muted-foreground">Leave blank for any drop</span>
          </div>
        </div>
      )}

      <button
        onClick={handleAdd}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent sm:w-auto"
      >
        <Heart className="h-4 w-4" />
        Add to wishlist
      </button>

      {error && <p className="mt-3 text-sm text-up">{error}</p>}
    </div>
  );
}
