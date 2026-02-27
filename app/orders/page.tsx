"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type OrderRow = {
  id: string;
  status: string;
  store: string | null;
  delivery_destination: string | null;
  created_at: string;
  cancel_reason?: string | null;
};

function prettyStore(store: string | null) {
  if (!store) return "—";
  return store;
}

function statusLabel(status: string, cancelReason?: string | null) {
  switch (status) {
    case "QUEUED":
    case "PENDING_ACCEPTANCE":
      return "Queued (waiting for runner)";
    case "ACCEPTED":
      return "Accepted (runner assigned)";
    case "SHOPPING":
      return "Ordered / Shopping";
    case "DELIVERING":
      return "Delivering";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
    case "CANCELED":
      return cancelReason?.trim() ? `Cancelled (${cancelReason})` : "Cancelled";
    default:
      return status;
  }
}

function isTerminal(status: string) {
  return status === "DELIVERED" || status === "CANCELLED" || status === "CANCELED";
}

function isActive(status: string) {
  return !isTerminal(status);
}

export default function MyOrdersPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [me, setMe] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState<string>("Loading...");
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // “Keep the most recent order visible for 1 hour”
  const RECENT_PIN_MS = 60 * 60 * 1000;

  async function load(userId?: string) {
    setStatus("Loading...");

    let uid = userId ?? me;

    if (!uid) {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        window.location.href = "/login";
        return;
      }

      uid = user.id;
      setMe(uid);
    }

    // Ensure expirations happen so UI reflects timeouts
    await supabase.rpc("expire_orders");

    const { data, error } = await supabase
      .from("orders")
      .select("id,status,store,delivery_destination,created_at,cancel_reason")
      .eq("created_by", uid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    setOrders((data as any) ?? []);
    setStatus("");
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let t: any = null;

    const refreshSoon = (why?: string) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        load();
      }, 250);
    };

    (async () => {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        window.location.href = "/login";
        return;
      }

      setMe(user.id);
      await load(user.id);

      channel = supabase
        .channel(`customer-orders:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `created_by=eq.${user.id}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const oid = (payload.new as any)?.id ?? (payload.old as any)?.id ?? "?";
            refreshSoon(`orders:${payload.eventType}:${oid}`);
          }
        )
        .subscribe();
    })();

    return () => {
      if (t) clearTimeout(t);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- UI helpers ----------
  const OrderCard = ({ o }: { o: OrderRow }) => {
    const label = statusLabel(o.status, o.cancel_reason);

    // Optional: make active ones stand out a bit
    const isAct = isActive(o.status);

    return (
      <a
        href={`/order/status?id=${o.id}`}
        style={{
          textDecoration: "none",
          color: "inherit",
          padding: 14,
          borderRadius: 18,
          border: isAct ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.14)",
          background: isAct ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>
            {prettyStore(o.store)} • {o.delivery_destination ?? "—"}
          </div>
          <div style={{ opacity: 0.85, fontWeight: 900 }}>
            {new Date(o.created_at).toLocaleString()}
          </div>
        </div>

        <div style={{ opacity: 0.95, fontSize: 15, fontWeight: 900 }}>
          {label}
        </div>

        <div style={{ opacity: 0.65, fontSize: 12 }}>
          Order ID: {o.id} • Tap to view
        </div>
      </a>
    );
  };

  const Section = ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => (
    <section
      style={{
        marginTop: 18,
        padding: 14,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          {subtitle ? <div style={{ opacity: 0.75, fontSize: 13 }}>{subtitle}</div> : null}
        </div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>{children}</div>
    </section>
  );

  // ---------- Split into Active/Recent + History ----------
  const sorted = orders; // already newest-first

  const mostRecent = sorted.length > 0 ? sorted[0] : null;

  const pinnedRecent =
    mostRecent &&
    Date.now() - new Date(mostRecent.created_at).getTime() <= RECENT_PIN_MS
      ? mostRecent
      : null;

  const active = sorted.filter((o) => isActive(o.status));

  // Build the “top” list:
  // - show all active
  // - plus pinnedRecent if it’s terminal (delivered/cancelled) and not already included
  const topIds = new Set<string>();
  const top: OrderRow[] = [];

  for (const o of active) {
    if (!topIds.has(o.id)) {
      topIds.add(o.id);
      top.push(o);
    }
  }

  if (pinnedRecent && !topIds.has(pinnedRecent.id)) {
    topIds.add(pinnedRecent.id);
    top.push(pinnedRecent);
  }

  // Everything not in top goes to history
  const history = sorted.filter((o) => !topIds.has(o.id));

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 900, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>My Orders</h1>
            <div style={{ opacity: 0.8 }}>
              Active orders + your most recent order stays visible for 1 hour
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/account" style={{ opacity: 0.85, textDecoration: "none" }}>
              ← Account
            </a>
            <a href="/order" style={{ opacity: 0.85, textDecoration: "none" }}>
              Start Order →
            </a>
          </div>
        </div>

        {status ? <div style={{ marginTop: 14, opacity: 0.85 }}>{status}</div> : null}

        {/* Top section */}
        <Section
          title="Active / Recent"
          subtitle="Active orders show here. Your newest order stays here for 1 hour even after delivery."
        >
          {top.length === 0 && !status ? (
            <div style={{ opacity: 0.75 }}>No active or recent orders.</div>
          ) : (
            top.map((o) => <OrderCard key={o.id} o={o} />)
          )}
        </Section>

        {/* History collapsible */}
        <section style={{ marginTop: 18 }}>
          <button
            onClick={() => setShowHistory((v) => !v)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.03)",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span>History</span>
            <span style={{ opacity: 0.85, fontWeight: 800 }}>
              {showHistory ? "Hide ▲" : `Show (${history.length}) ▼`}
            </span>
          </button>

          {showHistory ? (
            <div
              style={{
                marginTop: 10,
                padding: 14,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.02)",
                display: "grid",
                gap: 10,
              }}
            >
              {history.length === 0 ? (
                <div style={{ opacity: 0.75 }}>No history yet.</div>
              ) : (
                history.map((o) => <OrderCard key={o.id} o={o} />)
              )}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}