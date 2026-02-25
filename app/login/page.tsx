"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function sendLink() {
    setStatus("Sending magic link...");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "http://localhost:3000/account",
      },
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    setStatus("Check your email for the login link.");
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
          Sign in
        </h1>

        <p style={{ opacity: 0.8, marginBottom: 16 }}>
          Enter your email to receive a magic login link.
        </p>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #333",
            background: "transparent",
            color: "inherit",
            marginBottom: 12,
          }}
        />

        <button
          onClick={sendLink}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            background: "white",
            color: "black",
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
          }}
        >
          Send login link
        </button>

        {status && (
          <p style={{ marginTop: 14, fontSize: 14, opacity: 0.85 }}>{status}</p>
        )}
      </div>
    </main>
  );
}