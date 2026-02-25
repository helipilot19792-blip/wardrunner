"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type OrderRow = {
  id: string;
  status: string;
  created_at: string;
  created_by: string | null;
  runner_id: string | null;
  delivery_destination: string | null;
  delivery_area: string | null;
  store: string | null;
  order_items?: { id: string; name: string; qty: number; notes: string | null }[];
};

function toLocalDateKey(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function labelForDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date();
  const todayKey = toLocalDateKey(today.toISOString());

  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestKey = toLocalDateKey(yest.toISOString());

  if (dateKey === todayKey) return "Today";
  if (dateKey === yestKey) return "Yesterday";
  return dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" });
}

export default function AdminPage() {
  const supabase = supabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapseAll, setCollapseAll] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setErr("Not signed in.");
        setLoading(false);
        return;
      }

      // Nice message (RLS still protects even if removed)
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sess.session.user.id)
        .single();

      if (profErr) {
        setErr(profErr.message);
        setLoading(false);
        return;
      }
      if (prof?.role !== "admin") {
        setErr("You are not an admin.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          created_at,
          created_by,
          runner_id,
          store,
          delivery_area,
          delivery_destination,
          order_items (
            id,
            name,
            qty,
            notes
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      const rows = ((data as any) ?? []) as OrderRow[];
      setOrders(rows);

      // default: collapse all (expanded false)
      const init: Record<string, boolean> = {};
      for (const o of rows) init[o.id] = false;
      setExpanded(init);

      setLoading(false);
    })();
  }, [supabase]);

  const grouped = useMemo(() => {
    // Orders are already newest-first from the query.
    // Group by local date key (YYYY-MM-DD).
    const map = new Map<string, OrderRow[]>();
    for (const o of orders) {
      const key = toLocalDateKey(o.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }

    // Sort date groups desc
    const keys = Array.from(map.keys()).sort((a, b) => (a > b ? -1 : 1));
    return keys.map((k) => ({ key: k, label: labelForDateKey(k), orders: map.get(k)! }));
  }, [orders]);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function setAll(open: boolean) {
    setExpanded((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const o of orders) next[o.id] = open;
      return next;
    });
    setCollapseAll(!open);
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 1040, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Admin — Orders</h1>
            <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>
              Showing latest {orders.length} orders • grouped by date • click an order to expand
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => setAll(collapseAll)} // if collapsed, open; if open, collapse
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "transparent",
                color: "inherit",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {collapseAll ? "Expand all" : "Collapse all"}
            </button>

            <a href="/" style={{ opacity: 0.85, textDecoration: "none" }}>
              ← Home
            </a>
          </div>
        </div>

        {loading && <div style={{ marginTop: 18, opacity: 0.8 }}>Loading…</div>}

        {!loading && err && (
          <div
            style={{
              marginTop: 18,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #333",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {err}
          </div>
        )}

        {!loading && !err && (
          <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
            {grouped.map((g) => (
              <section key={g.key}>
                <div
                  style={{
                    fontWeight: 900,
                    marginBottom: 10,
                    opacity: 0.9,
                    fontSize: 16,
                  }}
                >
                  {g.label}
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {g.orders.map((o) => {
                    const isOpen = !!expanded[o.id];
                    const createdTime = new Date(o.created_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const itemCount = o.order_items?.reduce((sum, it) => sum + (it.qty ?? 0), 0) ?? 0;

                    return (
                      <div
                        key={o.id}
                        style={{
                          border: "1px solid #333",
                          borderRadius: 16,
                          background: "rgba(255,255,255,0.03)",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          onClick={() => toggle(o.id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: 14,
                            background: "transparent",
                            color: "inherit",
                            border: "none",
                            cursor: "pointer",
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                              <span style={{ fontWeight: 900 }}>{o.status}</span>
                              <span style={{ opacity: 0.7, fontWeight: 700 }}>• {o.store ?? "—"}</span>
                              <span style={{ opacity: 0.7 }}>• {createdTime}</span>
                              <span style={{ opacity: 0.7 }}>• {itemCount} item(s)</span>
                            </div>
                            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                              <b>Dest:</b> {o.delivery_destination ?? "—"}{" "}
                              <span style={{ opacity: 0.5 }}>•</span>{" "}
                              <b>Order:</b> {o.id.slice(0, 8)}…
                            </div>
                          </div>

                          <div style={{ fontWeight: 900, opacity: 0.8 }}>
                            {isOpen ? "▾" : "▸"}
                          </div>
                        </button>

                        {isOpen && (
                          <div style={{ padding: 14, borderTop: "1px solid #2a2a2a" }}>
                            <div style={{ fontSize: 13, opacity: 0.85, display: "grid", gap: 4 }}>
                              <div><b>Order ID:</b> {o.id}</div>
                              <div><b>Customer:</b> {o.created_by ?? "—"}</div>
                              <div><b>Runner:</b> {o.runner_id ?? "—"}</div>
                              <div><b>Area:</b> {o.delivery_area ?? "—"}</div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontWeight: 900, marginBottom: 6 }}>Items</div>
                              {o.order_items?.length ? (
                                <div style={{ display: "grid", gap: 6 }}>
                                  {o.order_items.map((it) => (
                                    <div
                                      key={it.id}
                                      style={{
                                        border: "1px solid #2a2a2a",
                                        borderRadius: 12,
                                        padding: 10,
                                        background: "rgba(255,255,255,0.02)",
                                      }}
                                    >
                                      <div style={{ fontWeight: 800 }}>
                                        {it.qty}× {it.name}
                                      </div>
                                      <div style={{ marginTop: 4, opacity: 0.8, fontSize: 13 }}>
                                        <b>Notes:</b> {it.notes ? it.notes : "—"}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ opacity: 0.65 }}>No items</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}