"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function RunnerSignupPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) {
        window.location.href = "/login";
        return;
      }
      setEmail(u.email ?? "");
    });
  }, [supabase]);

  async function requestAccess() {
    setStatus("Requesting runner access...");

    const res = await fetch("/api/runner/request-access", { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(`Error: ${data?.error ?? res.statusText}`);
      return;
    }

    setStatus("Runner access granted for this account. Redirecting...");
    setTimeout(() => {
      window.location.href = "/runner";
    }, 600);
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 520, padding: 24 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>
          Runner Signup
        </h1>

        <p style={{ opacity: 0.85, marginBottom: 14 }}>
          Signed in as: <b>{email || "…"}</b>
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          <button
            onClick={requestAccess}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              background: "white",
              color: "black",
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
            }}
          >
            Request / Enable Runner Access
          </button>

          <a
            href="/account"
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.02)",
              color: "white",
              textDecoration: "none",
              fontWeight: 900,
              textAlign: "center",
            }}
          >
            ← Back to Account
          </a>
        </div>

        {status ? (
          <p style={{ marginTop: 14, fontSize: 14, opacity: 0.85 }}>
            {status}
          </p>
        ) : null}

        <div style={{ marginTop: 18, opacity: 0.7, fontSize: 12 }}>
          Note: This is for testing. Later we can change this to “request approval”
          instead of instantly enabling.
        </div>
      </div>
    </main>
  );
}