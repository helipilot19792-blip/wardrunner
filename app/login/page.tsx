"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = supabaseBrowser();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setStatus("Enter email + password.");
      return;
    }

    setBusy(true);
    setStatus(mode === "signup" ? "Creating account..." : "Signing in...");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          setStatus(`Error: ${error.message}`);
          return;
        }

        setStatus("Account created. You can now sign in.");
        setMode("signin");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }

      // Successful login
      window.location.href = "/account";
    } finally {
      setBusy(false);
    }
  }

  async function sendReset() {
    if (!email.trim()) {
      setStatus("Enter your email first.");
      return;
    }

    setBusy(true);
    setStatus("Sending password reset email...");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/account?reset=1`,
        }
      );

      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }

      setStatus("Password reset email sent. Check your inbox.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
          {mode === "signup" ? "Create Account" : "Sign In"}
        </h1>

        <p style={{ opacity: 0.8, marginBottom: 16 }}>
          {mode === "signup"
            ? "Create an account with email + password."
            : "Sign in with your email + password."}
        </p>

        {/* Email */}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
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

        {/* Password + Toggle */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #333",
              background: "transparent",
              color: "inherit",
            }}
          />

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={busy}
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "transparent",
              color: "inherit",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={busy}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            background: "white",
            color: "black",
            fontWeight: 800,
            border: "none",
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.7 : 1,
            marginBottom: 12,
          }}
        >
          {busy
            ? "Please wait..."
            : mode === "signup"
            ? "Create Account"
            : "Sign In"}
        </button>

        {/* Forgot Password */}
        {mode === "signin" && (
          <button
            onClick={sendReset}
            disabled={busy}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: busy ? "not-allowed" : "pointer",
              textDecoration: "underline",
              marginBottom: 12,
              opacity: busy ? 0.7 : 1,
            }}
          >
            Forgot password?
          </button>
        )}

        {/* Toggle Mode */}
        <button
          onClick={() => {
            setStatus("");
            setMode(mode === "signup" ? "signin" : "signup");
          }}
          disabled={busy}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: "inherit",
            cursor: busy ? "not-allowed" : "pointer",
            textDecoration: "underline",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "New user? Create account"}
        </button>

        {status && (
          <p style={{ marginTop: 14, fontSize: 14, opacity: 0.85 }}>
            {status}
          </p>
        )}
      </div>
    </main>
  );
}