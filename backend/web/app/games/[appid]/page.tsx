"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PriceChart from "@/components/PriceChart";
import WishlistButton from "@/components/WishlistButton";
import { formatPrice, gameInitials } from "@/lib/utils";

type Game = {
  id: string;
  appid: string;
  title: string;
};

type Snapshot = {
  price_cents: number;
  scraped_at: string;
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
          tone === "down" ? "text-down" : tone === "up" ? "text-up" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function GameDetailPage() {
  const params = useParams<{ appid: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = await createClient();
      const { data: gameRow, error: gameError } = await supabase
        .from("games")
        .select("id, appid, title")
        .eq("appid", params.appid)
        .single();

      if (gameError || !gameRow) {
        setError(gameError?.message ?? "Game not found");
        setLoading(false);
        return;
      }

      const { data: snapshotRows, error: snapshotError } = await supabase
        .from("price_snapshots")
        .select("price_cents, scraped_at")
        .eq("game_id", gameRow.id)
        .order("scraped_at", { ascending: true });

      if (snapshotError) {
        setError(snapshotError.message);
        setLoading(false);
        return;
      }

      setGame(gameRow);
      setSnapshots(snapshotRows ?? []);
      setLoading(false);
    }

    load();
  }, [params.appid]);

  const stats = useMemo(() => {
    if (snapshots.length === 0) return null;
    const prices = snapshots.map((s) => s.price_cents);
    const current = prices[prices.length - 1];
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    return { current, lowest, highest, atLow: current === lowest };
  }, [snapshots]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-24 animate-pulse rounded-xl border border-border bg-card" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
        <div className="mt-4 h-[360px] animate-pulse rounded-xl border border-border bg-card" />
      </main>
    );
  }

  if (error || !game) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-up" />
          <h1 className="mt-4 text-lg font-medium">{error ?? "Game not found."}</h1>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all games
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All games
      </Link>

      {/* Header */}
      <div className="mt-5 flex items-start gap-4">
        <div
          className="flex h-16 w-16 flex-none items-center justify-center rounded-xl border border-border bg-muted font-mono text-xl font-semibold text-primary"
          aria-hidden
        >
          {gameInitials(game.title) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">{game.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Steam App {game.appid}</p>
        </div>
        {stats?.atLow && (
          <span className="hidden flex-none rounded-full bg-down/10 px-3 py-1 text-xs font-semibold text-down sm:inline-block">
            At all-time low
          </span>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Current" value={formatPrice(stats.current)} tone={stats.atLow ? "down" : undefined} />
          <Stat label="Lowest" value={formatPrice(stats.lowest)} tone="down" />
          <Stat label="Highest" value={formatPrice(stats.highest)} tone="up" />
        </div>
      )}

      {/* Chart */}
      <div className="mt-4">
        <PriceChart snapshots={snapshots} />
      </div>

      {/* Wishlist */}
      <div className="mt-6">
        <WishlistButton
          gameId={game.id}
          latestPriceCents={snapshots.length > 0 ? snapshots[snapshots.length - 1].price_cents : null}
        />
      </div>
    </main>
  );
}
