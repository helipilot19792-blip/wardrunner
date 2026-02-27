"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = supabaseBrowser();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function fullName() {
    return `${firstName}`.trim() && `${lastName}`.trim()
      ? `${firstName.trim()} ${lastName.trim()}`
      : `${firstName} ${lastName}`.trim();
  }

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setStatus("Enter email + password.");
      return;
    }

    if (mode === "signup") {
      if (!firstName.trim() || !lastName.trim()) {
        setStatus("Enter your first and last name.");
        return;
      }
    }

    setBusy(true);
    setStatus(mode === "signup" ? "Creating account..." : "Signing in...");

    try {
      if (mode === "signup") {
        const name = fullName();

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            // store on auth user metadata too (handy later)
            data: { full_name: name },
          },
        });

        if (error) {
          setStatus(`Error: ${error.message}`);
          return;
        }

        const userId = data.user?.id;
        if (userId) {
          // save into profiles table
          const { error: pErr } = await supabase
            .from("profiles")
            .upsert({ id: userId, full_name: name });

          if (pErr) {
            // account created, but profile write failed
            setStatus(`Account created, but profile save failed: ${pErr.message}`);
            setMode("signin");
            return;
          }
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/account?reset=1`,
      });

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
            ? "Create an account with your real name, email + password."
            : "Sign in with your email + password."}
        </p>

        {mode === "signup" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              autoComplete="given-name"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #333",
                background: "transparent",
                color: "inherit",
              }}
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              autoComplete="family-name"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #333",
                background: "transparent",
                color: "inherit",
              }}
            />
          </div>
        ) : null}

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

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
          {busy ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
        </button>

        {mode === "signin" ? (
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
        ) : null}

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
          {mode === "signup" ? "Already have an account? Sign in" : "New user? Create account"}
        </button>

        {status ? <p style={{ marginTop: 14, fontSize: 14, opacity: 0.85 }}>{status}</p> : null}
      </div>
    </main>
  );
}