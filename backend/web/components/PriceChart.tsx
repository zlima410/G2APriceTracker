"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Snapshot = {
  price_cents: number;
  scraped_at: string;
};

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: null },
] as const;

export default function PriceChart({ snapshots }: { snapshots: Snapshot[] }) {
  const [rangeDays, setRangeDays] = useState<number | null>(30);

  const cutoff = rangeDays ? Date.now() - rangeDays * 24 * 60 * 60 * 1000 : null;

  const filtered = snapshots
    .filter((s) => !cutoff || new Date(s.scraped_at).getTime() >= cutoff)
    .map((s) => ({
      date: new Date(s.scraped_at).toLocaleDateString(),
      price: s.price_cents / 100,
    }));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRangeDays(r.days)}
            className={`px-3 py-1 rounded border text-sm ${
              rangeDays === r.days ? "bg-black text-white" : "bg-white text-gray-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {filtered.length < 2 ? (
        // A line chart with 0-1 points is meaningless — be honest about
        // it instead of rendering an empty/broken-looking chart. This is
        // exactly the case the brief flagged: needs a week or two of
        // accumulated cron runs before this looks like anything.
        <p className="text-gray-500 text-sm py-12 text-center">
          Not enough price history yet for this range — check back after a few more scrapes.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} domain={["auto", "auto"]} />
            <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Price"]} />
            <Line type="stepAfter" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}