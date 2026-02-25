"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type OrderItemRow = {
  id: string;
  name: string | null;
  qty: number | null;
  notes: string | null;
};

type OrderRow = {
  id: string;
  status: string;
  store: string;
  delivery_destination: string | null;
  created_at: string;
  runner_id: string | null;
  order_items?: OrderItemRow[]; // ✅ added
};

async function clearAllOrders() {
  const c1 = confirm("Emergency action: cancel ALL active orders?");
  if (!c1) return;

  const c2 = confirm("This will cancel EVERY queued/active order. Continue?");
  if (!c2) return;

  const c3 = confirm("FINAL CONFIRMATION: Proceed with cancelling all orders?");
  if (!c3) return;

  const res = await fetch("/api/runner/clear-all", { method: "POST" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    alert(`Clear-all failed: ${data?.error ?? res.statusText}`);
    return;
  }

  alert("All active orders cancelled.");
  window.location.reload();
}

export default function RunnerPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [me, setMe] = useState<string | null>(null);

  const [queue, setQueue] = useState<OrderRow[]>([]);
  const [inProgress, setInProgress] = useState<OrderRow[]>([]);
  const [history, setHistory] = useState<OrderRow[]>([]);

  const [status, setStatus] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);

  async function load() {
    setStatus("Loading...");

    // Who am I?
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setStatus("Error: Not authenticated");
      return;
    }
    setMe(user.id);

    // ✅ One select string used everywhere (includes order_items)
    const orderSelect = `
      id,
      status,
      store,
      delivery_destination,
      created_at,
      runner_id,
      expires_at,
      order_items (
        id,
        name,
        qty,
        notes
      )
    `;

    // QUEUE: queued + unassigned
    const { data: qData, error: qErr } = await supabase
  .from("orders")
  .select(orderSelect)
  .in("status", ["QUEUED", "PENDING_ACCEPTANCE"])
  .is("runner_id", null)
  .gt("expires_at", new Date().toISOString())
  // TODO: set this to your exact Marotta enum value if store is an enum
  // .eq("store", "MAROTTA_FAMILY_HOSPITAL")
  .order("created_at", { ascending: false });

    if (qErr) {
      setStatus(`Error loading queue: ${qErr.message}`);
      return;
    }

    // IN PROGRESS: my accepted orders
    const { data: pData, error: pErr } = await supabase
      .from("orders")
      .select(orderSelect)
      .eq("runner_id", user.id)
      .eq("status", "ACCEPTED")
      .order("created_at", { ascending: false });

    if (pErr) {
      setStatus(`Error loading in-progress: ${pErr.message}`);
      return;
    }

    // HISTORY: my delivered/cancelled
    const { data: hData, error: hErr } = await supabase
      .from("orders")
      .select(orderSelect)
      .eq("runner_id", user.id)
      .in("status", ["DELIVERED", "CANCELLED"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (hErr) {
      setStatus(`Error loading history: ${hErr.message}`);
      return;
    }

    setQueue((qData as any) ?? []);
    setInProgress((pData as any) ?? []);
    setHistory((hData as any) ?? []);
    setStatus("");
  }

async function accept(id: string) {
  setStatus("Accepting...");

  const { data, error } = await supabase.rpc("accept_order", {
    p_order_id: id,
  });

  if (error) {
    setStatus(`Error: ${error.message}`);
    return;
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    setStatus("Order already taken or expired.");
    await load();
    return;
  }

  await load();
  setStatus("Accepted!");
  setTimeout(() => setStatus(""), 800);
}

  async function markDelivered(orderId: string) {
    setStatus("Marking delivered...");
    const res = await fetch(`/api/runner/orders/${orderId}/delivered`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(`Error: ${data?.error ?? "Unable to mark delivered"}`);
      return;
    }

    setStatus("Delivered!");
    await load();
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const OrderCard = ({
  o,
  right,
  onOpen,
}: {
  o: OrderRow;
  right?: React.ReactNode;
  onOpen?: () => void;
}) => (
   <div
  onClick={onOpen}
  style={{
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.02)",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    alignItems: "start",
    cursor: "pointer",
  }}
>
    
      <div>
        <div style={{ fontWeight: 900 }}>
          {o.store} • {o.delivery_destination ?? "—"}
        </div>

        <div style={{ opacity: 0.8, fontSize: 13 }}>
          {o.status} • {new Date(o.created_at).toLocaleString()}
        </div>

        {/* ✅ Items list */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Items</div>

          {!o.order_items || o.order_items.length === 0 ? (
            <div style={{ opacity: 0.7, fontSize: 13 }}>No items found.</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {o.order_items.map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{it.name ?? "—"}</div>
                  <div style={{ opacity: 0.85, fontSize: 13 }}>x{it.qty ?? 1}</div>
                </div>
              ))}
              {/* Optional: show notes */}
              {o.order_items.some((x) => x.notes) ? (
                <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                  Notes:{" "}
                  {o.order_items
                    .map((x) => x.notes)
                    .filter(Boolean)
                    .join(" • ")}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 8 }}>Order ID: {o.id}</div>
      </div>

 <div onClick={(e) => e.stopPropagation()}>
  {right ?? null}
</div>

</div>
);

   return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 900, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>Runner</h1>
            <div style={{ opacity: 0.8 }}>Queue → In Progress → Delivered (auto-refresh every 5s)</div>
            {me ? <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>Runner ID: {me}</div> : null}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/account" style={{ opacity: 0.85, textDecoration: "none" }}>
              ← Account
            </a>

            <button
              onClick={clearAllOrders}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,0,0,0.15)",
                color: "white",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              🚨 Emergency: Clear All Orders
            </button>
          </div>
        </div>

        <Section title="Queue" subtitle="Orders waiting to be accepted">
          {queue.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No queued orders.</div>
          ) : (
            queue.map((o) => (
              <OrderCard
                key={o.id}
                o={o}
                onOpen={() => (window.location.href = `/runner/orders/${o.id}`)}
                right={
                  <button
                    onClick={() => accept(o.id)}
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
                    Accept
                  </button>
                }
              />
            ))
          )}
        </Section>

        <Section title="In Progress" subtitle="Orders you accepted (next action: Delivered)">
          {inProgress.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No orders in progress.</div>
          ) : (
            inProgress.map((o) => (
              <OrderCard
                key={o.id}
                o={o}
                onOpen={() => (window.location.href = `/runner/orders/${o.id}`)}
                right={
                  <button
                    onClick={() => markDelivered(o.id)}
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
                    Delivered
                  </button>
                }
              />
            ))
          )}
        </Section>

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
        history.map((o) => (
          <OrderCard
            key={o.id}
            o={o}
            onOpen={() => (window.location.href = `/runner/orders/${o.id}`)}
          />
        ))
      )}
    </div>
  ) : null}
</section>

        {status ? <div style={{ marginTop: 12, opacity: 0.85 }}>{status}</div> : null}
      </div>
    </main>
  );
}