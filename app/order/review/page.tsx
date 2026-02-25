"use client";

import { useEffect, useMemo, useState } from "react";

type Draft = {
  category: "Coffee" | "Snacks" | "Errands" | "Other";
  store: "TIMS" | "CAFETERIA" | "GIFT" | "PHARMACY_OTC";
  cart: Array<{ id: string; name: string; qty: number; notes?: string }>;
};

// Stored payload in sessionStorage
type StoredDraft = {
  draftId: string; // stable id for navigation
  draft: Draft;
  dest?: string;
  notes?: string;
  tip?: number;
  cap?: number;
};

const capOptions = [
  { label: "$15 cap", cents: 1500 },
  { label: "$25 cap", cents: 2500 },
  { label: "$35 cap", cents: 3500 },
  { label: "$50 cap", cents: 5000 },
];

const STORAGE_KEY = "wardrunner_draft_v2";

function newDraftId() {
  // good enough for client-side stable id
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ReviewPage() {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const [dest, setDest] = useState("");
  const [notes, setNotes] = useState("");
  const [tip, setTip] = useState(300); // $3 default
  const [cap, setCap] = useState(2500);

  const [status, setStatus] = useState("");

  // Load draft + persisted fields
  useEffect(() => {
    // Back-compat: old key
    const oldRaw = sessionStorage.getItem("wardrunner_draft");
    const v2Raw = sessionStorage.getItem(STORAGE_KEY);

    if (v2Raw) {
      try {
        const parsed = JSON.parse(v2Raw) as StoredDraft;
        setDraftId(parsed.draftId);
        setDraft(parsed.draft);
        setDest(parsed.dest ?? "");
        setNotes(parsed.notes ?? "");
        setTip(typeof parsed.tip === "number" ? parsed.tip : 300);
        setCap(typeof parsed.cap === "number" ? parsed.cap : 2500);
        return;
      } catch {
        // fall through to old
      }
    }

    if (oldRaw) {
      try {
        const parsedDraft = JSON.parse(oldRaw) as Draft;
        const id = newDraftId();
        const payload: StoredDraft = { draftId: id, draft: parsedDraft, dest: "", notes: "", tip: 300, cap: 2500 };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

        setDraftId(id);
        setDraft(parsedDraft);
        return;
      } catch {
        // ignore
      }
    }
  }, []);

  // Persist whenever user edits destination/notes/tip/cap (so back/forth doesn't wipe)
  useEffect(() => {
    if (!draftId || !draft) return;
    const payload: StoredDraft = { draftId, draft, dest, notes, tip, cap };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [draftId, draft, dest, notes, tip, cap]);

  const totalItems = useMemo(() => {
    if (!draft) return 0;
    return draft.cart.reduce((sum, x) => sum + x.qty, 0);
  }, [draft]);

  async function submit() {
    if (!draft) return;
    if (!dest.trim()) {
      setStatus("Please enter delivery destination (room/wing/unit).");
      return;
    }

    setStatus("Submitting...");

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store: draft.store,
        category: draft.category,
        deliveryDestination: dest.trim(),
        notes: notes.trim() || undefined,
        tipCents: tip,
        itemCapCents: cap,

        items: draft.cart.map((i) => ({
          name: i.name,
          qty: i.qty,
          notes: i.notes?.trim() ? i.notes.trim() : undefined,
        })),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(`Error: ${data?.error ?? "Unknown error"}`);
      return;
    }

    // clear both keys (back-compat)
    sessionStorage.removeItem("wardrunner_draft");
    sessionStorage.removeItem(STORAGE_KEY);

    window.location.href = "/?orderPlaced=1";
  }

  if (!draft || !draftId) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ maxWidth: 520, padding: 24, opacity: 0.8 }}>
          Nothing to review. Go back to <a href="/order">Start Order</a>.
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 720, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>Review</h1>
            <div style={{ opacity: 0.8 }}>
              {draft.category} • {draft.store} • {totalItems} item(s)
            </div>
          </div>

          {/* ✅ Edit now preserves draftId */}
          <a
            href={`/order?draftId=${draftId}`}
            style={{ opacity: 0.85, textDecoration: "none" }}
          >
            ← Edit
          </a>
        </div>

        <section style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Delivery destination</div>
          <input
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            placeholder="e.g., Room 4B-12 / ICU nurse station / Wing C"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: "1px solid #333",
              background: "transparent",
              color: "inherit",
            }}
          />
        </section>

        <section style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Order notes (optional)</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the runner should know (no hospital-paid tasks)."
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: "1px solid #333",
              background: "transparent",
              color: "inherit",
              minHeight: 90,
            }}
          />
        </section>

        <section style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Item spending cap</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {capOptions.map((o) => (
              <button
                key={o.cents}
                onClick={() => setCap(o.cents)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: cap === o.cents ? "2px solid white" : "1px solid #333",
                  background: "transparent",
                  color: "inherit",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
            This is the max the runner can spend on items before requesting more authorization.
          </div>
        </section>

        <section style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Tip (for runner)</div>
          <input
            type="number"
            value={Math.round(tip / 100)}
            onChange={(e) => setTip(Math.max(0, Number(e.target.value) || 0) * 100)}
            style={{
              width: 140,
              padding: 12,
              borderRadius: 14,
              border: "1px solid #333",
              background: "transparent",
              color: "inherit",
            }}
          />{" "}
          <span style={{ opacity: 0.8 }}>(CAD)</span>
        </section>

        <section style={{ marginTop: 22 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Items</div>
          <div style={{ display: "grid", gap: 10 }}>
            {draft.cart.map((i) => (
              <div
                key={i.id}
                style={{
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid #333",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>{i.name}</div>
                  <div style={{ opacity: 0.85 }}>x{i.qty}</div>
                </div>

                {i.notes?.trim() ? (
                  <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
                    Note: {i.notes}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={submit}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              background: "white",
              color: "black",
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
            }}
          >
            Place Order →
          </button>
        </div>

        {status && <div style={{ marginTop: 12, opacity: 0.85 }}>{status}</div>}
      </div>
    </main>
  );
}