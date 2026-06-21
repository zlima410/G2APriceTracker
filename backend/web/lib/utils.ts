import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const hasEnvVars = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function formatPrice(cents: number | null | undefined, currency?: string | null) {
  if (cents === null || cents === undefined) return "—";
  if (cents === 0) return "Free";
  const value = (cents / 100).toFixed(2);
  return `$${value}${currency ? ` ${currency}` : ""}`.trim();
}

export function gameInitials(title: string) {
  return title
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function steamCapsuleUrl(appid: string) {
  return `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/capsule_184x69.jpg`;
}
