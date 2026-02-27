"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type ProfileRow = {
  full_name: string | null;
};

export default function AccountPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [label, setLabel] = useState<string>("…");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        window.location.href = "/login";
        return;
      }

      // Try to load profile name
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      // If profile missing or blocked, fallback to email
      if (pErr || !prof?.full_name || !prof.full_name.trim()) {
        setLabel(user.email ?? "…");
        return;
      }

      setLabel(prof.full_name);
    })();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 520, padding: 24, width: "100%" }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>Account</h1>

        <p style={{ opacity: 0.85, marginBottom: 18 }}>
          Signed in as: <b>{label}</b>
        </p>

        {status ? <div style={{ opacity: 0.85, marginBottom: 12 }}>{status}</div> : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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

          <a
            href="/runner"
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
            Runner
          </a>

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