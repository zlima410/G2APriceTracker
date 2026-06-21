import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatPrice, gameInitials } from "@/lib/utils";

type Props = {
  appid: string;
  title: string;
  priceCents: number | null;
  currency: string | null;
};

export default function GameCard({ appid, title, priceCents, currency }: Props) {
  const isFree = priceCents === 0;
  const hasPrice = priceCents !== null && priceCents !== undefined;

  return (
    <Link
      href={`/games/${appid}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-muted"
    >
      {/* Cover placeholder — initials avatar keeps the grid lively without external art */}
      <div
        className="flex h-14 w-14 flex-none items-center justify-center rounded-lg border border-border bg-muted font-mono text-base font-semibold text-primary"
        aria-hidden
      >
        {gameInitials(title) || "?"}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">App {appid}</p>
      </div>

      <div className="flex flex-none items-center gap-3">
        <span
          className={`rounded-lg px-2.5 py-1 font-mono text-sm font-semibold tabular-nums ${
            isFree
              ? "bg-down/10 text-down"
              : hasPrice
                ? "bg-muted text-foreground"
                : "text-muted-foreground"
          }`}
        >
          {formatPrice(priceCents, currency)}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}
