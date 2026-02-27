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
      return "Queued (waiting for runner)";

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
      return cancelReason?.trim()
        ? `Cancelled (${cancelReason})`
        : "Cancelled";

    default:
      return status;
  }
}

export default function MyOrdersPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [me, setMe] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState<string>("Loading...");

  async function load(userId?: string) {
    setStatus("Loading...");

    // 1) who am I?
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

    // Optional: expire orders so statuses are accurate
    // (if you already added expire_orders for runner, you can also keep it here)
    await supabase.rpc("expire_orders");

    // 2) load my recent orders
    const { data, error } = await supabase
      .from("orders")
      .select("id,status,store,delivery_destination,created_at,cancel_reason")
      .eq("created_by", uid)
      .order("created_at", { ascending: false })
      .limit(25);

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
        // console.log("[realtime] customer refresh", why ?? "");
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

      // Initial load
      await load(user.id);

      // Realtime: listen only to MY orders (created_by = user.id)
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
            // console.log("[realtime] orders", payload.eventType, oid);
            refreshSoon(`orders:${payload.eventType}:${oid}`);
          }
        )
        .subscribe((s) => {
          // console.log("[realtime] customer subscribe status:", s);
        });
    })();

    return () => {
      if (t) clearTimeout(t);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 900, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>My Orders</h1>
            <div style={{ opacity: 0.8 }}>
              Live status updates (no manual refresh)
            </div>
            {me ? <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>User ID: {me}</div> : null}
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

        {status ? (
          <div style={{ marginTop: 14, opacity: 0.85 }}>{status}</div>
        ) : null}

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {orders.length === 0 && !status ? (
            <div style={{ opacity: 0.75 }}>No orders yet.</div>
          ) : null}

          {orders.map((o) => (
            <a
              key={o.id}
              href={`/order/status?id=${o.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                padding: 14,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.02)",
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

              <div style={{ opacity: 0.9, fontSize: 14, fontWeight: 800 }}>
                {statusLabel(o.status, o.cancel_reason)}
              </div>

              <div style={{ opacity: 0.65, fontSize: 12 }}>
                Order ID: {o.id} • Tap to view live status
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}