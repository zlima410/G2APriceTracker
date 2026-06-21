"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const { session, loading } = useAuth();
  const supabase = createClient();

  return (
    <nav className="border-b px-8 py-4 flex justify-between items-center">
      <Link href="/" className="font-semibold">
        Steam Price Tracker
      </Link>

      <div className="flex gap-4 items-center text-sm">
        {!loading && session && (
          <Link href="/wishlist" className="hover:underline">
            My Wishlist
          </Link>
        )}

        {loading ? null : session ? (
          <button onClick={() => supabase.auth.signOut()} className="text-gray-600 hover:underline">
            Sign out
          </button>
        ) : (
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
