import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const hasEnvVars = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Format a price stored in cents into a human-readable string. */
export function formatPrice(cents: number | null | undefined, currency?: string | null) {
  if (cents === null || cents === undefined) return "—";
  if (cents === 0) return "Free";
  const value = (cents / 100).toFixed(2);
  return `$${value}${currency ? ` ${currency}` : ""}`.trim();
}

/** Initials/short label for a game title, used in cover placeholders. */
export function gameInitials(title: string) {
  return title
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
