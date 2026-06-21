"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, TrendingDown, Bell, LineChart, ArrowRight, Gamepad2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Game = {
  id: string;
  appid: string;
  title: string;
};

type Snapshot = {
  game_id: string;
  price_cents: number;
  currency: string | null;
};

type GameWithPrice = Game & { latestPriceCents: number | null; currency: string | null };

import GameCard from "@/components/GameCard";

export default function BrowsePage() {
  const [games, setGames] = useState<GameWithPrice[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = await createClient();
      const { data: gameRows, error: gameError } = await supabase
        .from("games")
        .select("id, appid, title")
        .order("title");

      if (gameError) {
        setError(gameError.message);
        setLoading(false);
        return;
      }

      const { data: snapshotRows, error: snapshotError } = await supabase
        .from("latest_prices")
        .select("game_id, price_cents, currency");

      if (snapshotError) {
        setError(snapshotError.message);
        setLoading(false);
        return;
      }

      const latestByGame = new Map<string, Snapshot>();
      for (const snap of snapshotRows ?? []) {
        latestByGame.set(snap.game_id, snap);
      }

      const merged: GameWithPrice[] = (gameRows ?? []).map((g) => {
        const snap = latestByGame.get(g.id);
        return {
          ...g,
          latestPriceCents: snap ? snap.price_cents : null,
          currency: snap ? snap.currency : null,
        };
      });

      setGames(merged);
      setLoading(false);
    }

    load();
  }, []);

  const filtered = useMemo(
    () => games.filter((g) => g.title.toLowerCase().includes(search.toLowerCase())),
    [games, search],
  );

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url(/hero-grid.png)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
            Live Steam price tracking
          </div>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Never overpay for a game <span className="text-primary">again.</span>
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
            Game Signal watches Steam price history and emails you the moment a game drops below your
            target. Build a wishlist, read the trends, and buy at the bottom.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#catalog"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-accent"
            >
              Browse tracked games
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Create free account
            </Link>
          </div>

          {/* Feature strip */}
          <div className="mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: LineChart, title: "Price history", desc: "See how a game's price moved over time." },
              { icon: Bell, title: "Drop alerts", desc: "Get emailed when it hits your target price." },
              { icon: TrendingDown, title: "Buy the dip", desc: "Stop guessing — wait for the real low." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Tracked games</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "Loading catalog…" : `${games.length} games being tracked`}
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search games…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-card py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <div className="mt-8">
          {error ? (
            <div className="rounded-xl border border-up/30 bg-up/10 p-6 text-up">
              Couldn&apos;t load games: {error}
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[84px] animate-pulse rounded-xl border border-border bg-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
              <Gamepad2 className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">
                {games.length === 0 ? "No games tracked yet" : `No games match “${search}”`}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {games.length === 0
                  ? "The tracker hasn't recorded any games yet. Check back after the next scrape."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filtered.map((g) => (
                <GameCard
                  key={g.id}
                  appid={g.appid}
                  title={g.title}
                  priceCents={g.latestPriceCents}
                  currency={g.currency}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
