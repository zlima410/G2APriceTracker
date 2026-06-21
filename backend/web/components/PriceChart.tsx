"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";

type Snapshot = {
  price_cents: number;
  scraped_at: string;
};

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "All", days: null },
] as const;

const CHART_COLOR = "#2dd4bf";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold text-foreground">
        ${Number(payload[0].value).toFixed(2)}
      </p>
    </div>
  );
}

export default function PriceChart({ snapshots }: { snapshots: Snapshot[] }) {
  const [rangeDays, setRangeDays] = useState<number | null>(30);

  const cutoff = rangeDays ? Date.now() - rangeDays * 24 * 60 * 60 * 1000 : null;

  const filtered = useMemo(
    () =>
      snapshots
        .filter((s) => !cutoff || new Date(s.scraped_at).getTime() >= cutoff)
        .map((s) => ({
          date: new Date(s.scraped_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          price: s.price_cents / 100,
        })),
    [snapshots, cutoff],
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Price history</h2>
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRangeDays(r.days)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                rangeDays === r.days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length < 2 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LineChartIcon className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Not enough price history for this range yet — check back after a few more scrapes.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={filtered} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2632" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#8b97a7" }}
              axisLine={{ stroke: "#1e2632" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#8b97a7" }}
              tickFormatter={(v) => `$${v}`}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2dd4bf", strokeDasharray: "4 4" }} />
            <Area
              type="stepAfter"
              dataKey="price"
              stroke={CHART_COLOR}
              strokeWidth={2}
              fill="url(#priceFill)"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLOR, stroke: "#0a0e14", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
