"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Game = {
  id: string;
  appid: string;
  title: string;
};

type Snapshot = {
  game_id: string;
  price_cents: number;
  currency: string | null;
  scraped_at: string;
};

type GameWithPrice = Game & { latestPriceCents: number | null; currency: string | null };

function formatPrice(cents: number | null, currency: string | null) {
  if (cents === null) return "-";
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)} ${currency ?? ""}`.trim();
}

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
        .from("price_snapshots")
        .select("game_id, price_cents, currency, scraped_at")
        .order("scraped_at", { ascending: false });

      if (snapshotError) {
        setError(snapshotError.message);
        setLoading(false);
        return;
      }

      const latestByGame = new Map<string, Snapshot>();
      for (const snap of snapshotRows ?? []) {
        if (!latestByGame.has(snap.game_id)) {
          latestByGame.set(snap.game_id, snap);
        }
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

  const filtered = games.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <main className="max-w-3xl mx-auto p-8">Loading games...</main>;
  }

  if (error) {
    return <main className="max-w-3xl mx-auto p-8 text-red-600">Couldn&apos;t load games: {error}</main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-4">Tracked games</h1>

      <input
        type="text"
        placeholder="Search games…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-6"
      />

      {filtered.length === 0 ? (
        <p className="text-gray-500">No games match &quot;{search}&quot;.</p>
      ) : (
        <ul className="divide-y">
          {filtered.map((g) => (
            <li key={g.id} className="py-3 flex justify-between items-center">
              <Link href={`/games/${g.appid}`} className="hover:underline">
                {g.title}
              </Link>
              <span className="text-gray-600">{formatPrice(g.latestPriceCents, g.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
