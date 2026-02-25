"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Home() {
  const supabase = supabaseBrowser();

  const [justPlaced, setJustPlaced] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Show success banner after redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("orderPlaced")) {
      setJustPlaced(true);
      window.history.replaceState({}, "", "/"); // clean URL
    }

    // Load auth session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    // Keep session updated
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 560, padding: 24 }}>
        {justPlaced && (
          <div
            style={{
              background: "#16a34a",
              color: "white",
              padding: "12px 16px",
              borderRadius: 12,
              marginBottom: 18,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            ✅ Order placed successfully!
          </div>
        )}

        <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 12 }}>
          WardRunner
        </h1>

        <p style={{ opacity: 0.8, marginBottom: 18 }}>
          Fast in-hospital runs for coffee, snacks, and approved items.
        </p>

        {session ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a
              href="/order"
              style={{
                display: "inline-block",
                padding: "12px 16px",
                borderRadius: 12,
                background: "white",
                color: "black",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Start Order
            </a>

            <a
              href="/orders"
              style={{
                display: "inline-block",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "transparent",
                color: "inherit",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              View Order Status
            </a>

            <a
              href="/account"
              style={{
                display: "inline-block",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "transparent",
                color: "inherit",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Account
            </a>
          </div>
        ) : (
          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: 12,
              background: "white",
              color: "black",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Sign in with SMS
          </a>
        )}
      </div>
    </main>
  );
}