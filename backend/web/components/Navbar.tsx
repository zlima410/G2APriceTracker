"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

export default function Navbar() {
  const { session, loading } = useAuth();
  const supabase = createClient();
  const pathname = usePathname();

  const isWishlist = pathname === "/wishlist";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <div className="flex items-center gap-1 sm:gap-2 text-sm">
          {!loading && session && (
            <Link
              href="/wishlist"
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors ${
                isWishlist
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Wishlist</span>
            </Link>
          )}

          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" aria-hidden />
          ) : session ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-accent"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
