import Link from "next/link";
import { Activity } from "lucide-react";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}
      aria-label="Game Signal home"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_20px_-4px_var(--primary)] transition-transform group-hover:scale-105">
        <Activity className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="text-base">
        Game<span className="text-primary">Signal</span>
      </span>
    </Link>
  );
}
