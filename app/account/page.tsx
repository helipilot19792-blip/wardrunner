"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AccountPage() {
  const supabase = supabaseBrowser();
  const [phone, setPhone] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setPhone(data.user?.phone ?? "");
      if (!data.user) window.location.href = "/login";
    });
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 520, padding: 24 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>
          Account
        </h1>

        <p style={{ opacity: 0.8, marginBottom: 18 }}>
          Logged in as: <b>{phone || "…"}</b>
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Start Order */}
          <a
            href="/order"
            style={{
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

          {/* ✅ NEW: My Orders */}
          <a
            href="/orders"
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            My Orders
          </a>

          {/* Sign Out */}
          <button
            onClick={signOut}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "transparent",
              color: "inherit",
              fontWeight: 800,
              border: "1px solid #333",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}