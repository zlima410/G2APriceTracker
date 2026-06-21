"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Bell, Trash2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import Switch from "@/components/Switch";
import { formatPrice, gameInitials } from "@/lib/utils";

type WishlistRow = {
  id: string;
  target_price_cents: number | null;
  notifications_enabled: boolean;
  games: {
    id: string;
    appid: string;
    title: string;
  };
};

type LatestPrice = { price_cents: number; currency: string | null };

export default function WishlistPage() {
  const { session, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistRow[]>([]);
  const [prices, setPrices] = useState<Record<string, LatestPrice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        // games(...) is a Supabase foreign-table select — pulls the related
        // game row in the same query instead of a manual join.
        const supabase = createClient();
        const { data: wishlistRows, error: wishlistError } = await supabase
          .from("wishlist_items")
          .select("id, target_price_cents, notifications_enabled, games(id, appid, title)")
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
      } catch {
        setError("Couldn't reach the price database. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [session, authLoading]);

  async function handleRemove(id: string) {
    const supabase = await createClient();
    await supabase.from("wishlist_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleToggleNotifications(id: string, nextValue: boolean) {
    // Optimistic update — flip it in the UI immediately, then persist.
    // If the write fails, roll back so the switch doesn't lie about
    // the actual saved state.
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, notifications_enabled: nextValue } : i)));

    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from("wishlist_items")
      .update({ notifications_enabled: nextValue })
      .eq("id", id);

    if (updateError) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, notifications_enabled: !nextValue } : i)));
      setActionError(`Couldn't update notification setting: ${updateError.message}`);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <Heart className="h-10 w-10 text-primary" />
          <h1 className="mt-4 text-lg font-medium">Your wishlist is private</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Sign in to track games and manage your price-drop alerts.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="flex items-center gap-3 rounded-xl border border-up/30 bg-up/10 p-5 text-up">
          <AlertCircle className="h-5 w-5 flex-none" />
          <p className="text-sm">Couldn&apos;t load your wishlist: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Wishlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "game" : "games"} tracked
          </p>
        </div>
      </div>

      {actionError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-up/30 bg-up/10 p-3 text-sm text-up">
          <AlertCircle className="h-4 w-4 flex-none" />
          {actionError}
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">Nothing here yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Browse the catalog and add games you want to watch for price drops.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
          >
            Browse games
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((item) => {
            const latest = prices[item.games.id];
            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-lg border border-border bg-muted font-mono text-sm font-semibold text-primary"
                    aria-hidden
                  >
                    {gameInitials(item.games.title) || "?"}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/games/${item.games.appid}`}
                      className="block truncate font-medium hover:text-primary"
                    >
                      {item.games.title}
                    </Link>
                    {item.notifications_enabled && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Bell className="h-3 w-3" />
                        {item.target_price_cents != null
                          ? `Notify below $${(item.target_price_cents / 100).toFixed(2)}`
                          : "Notify on any drop"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatPrice(latest?.price_cents ?? null, latest?.currency ?? null)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.notifications_enabled}
                      onChange={(next) => handleToggleNotifications(item.id, next)}
                      label={`Notifications for ${item.games.title}`}
                    />
                    <button
                      onClick={() => handleRemove(item.id)}
                      aria-label={`Remove ${item.games.title} from wishlist`}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-up"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
