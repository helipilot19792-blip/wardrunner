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
  order_items?: OrderItemRow[];
};

function getOrderIdFromPath(): string | null {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  // /runner/orders/[id]
  const id = parts[parts.length - 1];
  return id || null;
}

export default function RunnerOrderDetailPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [me, setMe] = useState<string | null>(null);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [status, setStatus] = useState<string>("Loading...");

  async function load(id: string) {
    setStatus("Loading order...");

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setStatus("Error: Not authenticated");
      return;
    }
    setMe(user.id);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        status,
        store,
        delivery_destination,
        created_at,
        runner_id,
        order_items (
          id,
          name,
          qty,
          notes
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      setStatus(`Error loading order: ${error.message}`);
      return;
    }

    setOrder((data as any) ?? null);
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
    await load(id);
    return;
  }

  await load(id);
  setStatus("Accepted!");
  setTimeout(() => setStatus(""), 800);
}

  async function markOrdered(id: string) {
    // We reuse your existing enum: SHOPPING
    setStatus("Marking ordered...");
    const res = await fetch(`/api/runner/orders/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SHOPPING" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`Error: ${data?.error ?? "Unable to update status"}`);
      return;
    }
    await load(id);
    setStatus("Marked Ordered!");
    setTimeout(() => setStatus(""), 800);
  }

  async function markDelivered(id: string) {
    setStatus("Marking delivered...");
    const res = await fetch(`/api/runner/orders/${id}/delivered`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`Error: ${data?.error ?? "Unable to mark delivered"}`);
      return;
    }
    await load(id);
    setStatus("Delivered!");
    setTimeout(() => setStatus(""), 800);
  }

  useEffect(() => {
    const id = getOrderIdFromPath();
    setOrderId(id);
    if (!id) {
      setStatus("Missing order id in URL.");
      return;
    }
    load(id);

    const t = setInterval(() => load(id), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAccept = order?.status === "QUEUED" && !order?.runner_id;
  const canMarkOrdered = order?.status === "ACCEPTED" || order?.status === "SHOPPING";
  const canDeliver = order?.status === "ACCEPTED" || order?.status === "SHOPPING";

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 900, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>Runner • Order</h1>
            <div style={{ opacity: 0.8 }}>
              Focus view (auto-refresh every 5s) — no confusion with other orders
            </div>
            {me ? <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>Runner ID: {me}</div> : null}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/runner" style={{ opacity: 0.9, textDecoration: "none" }}>
              ← Back to Runner
            </a>
            <a href="/account" style={{ opacity: 0.75, textDecoration: "none" }}>
              Account
            </a>
          </div>
        </div>

        <section
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          {status ? <div style={{ marginBottom: 12, opacity: 0.9 }}>{status}</div> : null}

          {!order ? (
            <div style={{ opacity: 0.75 }}>No order loaded.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {order.store} • {order.delivery_destination ?? "—"}
                  </div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    Status: <span style={{ fontWeight: 900 }}>{order.status}</span> •{" "}
                    {new Date(order.created_at).toLocaleString()}
                  </div>
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>Order ID: {order.id}</div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    disabled={!orderId || !canAccept}
                    onClick={() => orderId && accept(orderId)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: canAccept ? "white" : "#444",
                      color: canAccept ? "black" : "#999",
                      fontWeight: 900,
                      border: "none",
                      cursor: canAccept ? "pointer" : "not-allowed",
                    }}
                  >
                    Accept
                  </button>

                  <button
                    disabled={!orderId || !canMarkOrdered}
                    onClick={() => orderId && markOrdered(orderId)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: canMarkOrdered ? "white" : "#444",
                      color: canMarkOrdered ? "black" : "#999",
                      fontWeight: 900,
                      border: "none",
                      cursor: canMarkOrdered ? "pointer" : "not-allowed",
                    }}
                  >
                    Ordered
                  </button>

                  <button
                    disabled={!orderId || !canDeliver}
                    onClick={() => orderId && markDelivered(orderId)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: canDeliver ? "white" : "#444",
                      color: canDeliver ? "black" : "#999",
                      fontWeight: 900,
                      border: "none",
                      cursor: canDeliver ? "pointer" : "not-allowed",
                    }}
                  >
                    Delivered
                  </button>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Items</div>

                {!order.order_items || order.order_items.length === 0 ? (
                  <div style={{ opacity: 0.75 }}>No items found.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {order.order_items.map((it) => (
                      <div
                        key={it.id}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ fontWeight: 900 }}>{it.name ?? "—"}</div>
                          <div style={{ opacity: 0.9, fontWeight: 900 }}>x{it.qty ?? 1}</div>
                        </div>
                        {it.notes ? (
                          <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
                            Note: {it.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}