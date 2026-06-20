"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PriceChart from "@/components/PriceChart";

type Game = {
  id: string;
  appid: string;
  title: string;
};

type Snapshot = {
  price_cents: number;
  scraped_at: string;
};

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

  if (loading) {
    return <main className="max-w-3xl mx-auto p-8">Loading…</main>;
  }

  if (error || !game) {
    return (
      <main className="max-w-3xl mx-auto p-8">
        <p className="text-red-600 mb-4">{error ?? "Game not found."}</p>
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to all games
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to all games
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">{game.title}</h1>
      <PriceChart snapshots={snapshots} />
    </main>
  );
}