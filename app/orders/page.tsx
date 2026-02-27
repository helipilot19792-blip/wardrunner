"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type OrderRow = {
  id: string;
  status: string;
  store: string;
  delivery_destination: string | null;
  created_at: string;
  cancel_reason: string | null;
};

function prettyStore(s: string) {
  if (s === "TIMS") return "Tim Hortons";
  if (s === "CAFETERIA") return "Cafeteria";
  if (s === "GIFT") return "Gift Shop";
  if (s === "PHARMACY_OTC") return "Pharmacy (OTC)";
  return s;
}

function statusLabel(status: string, cancelReason?: string | null) {
  switch (status) {
    case "QUEUED":
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
      if (cancelReason === "TIMED_OUT") {
        return "Timed out (not accepted in time)";
      }
      return "Cancelled";

    default:
      return status;
  }
}

export default function MyOrdersPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState("Loading...");

  async function load() {
    setStatus("Loading...");

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setStatus("Error: Not authenticated");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("id,status,store,delivery_destination,created_at,cancel_reason")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    setOrders((data as any) ?? []);
    setStatus("");
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // live-ish updates
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 720, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>My Orders</h1>
            <div style={{ opacity: 0.8 }}>Your last 3 orders (auto-refresh every 5s)</div>
          </div>
          <a href="/account" style={{ opacity: 0.85, textDecoration: "none" }}>
            ← Account
          </a>
        </div>

        <section style={{ marginTop: 18 }}>
          {status ? <div style={{ opacity: 0.85 }}>{status}</div> : null}

          {orders.length === 0 && !status ? (
            <div style={{ opacity: 0.75 }}>No orders yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {orders.map((o) => (
                <a
                  key={o.id}
                  href={`/order/${o.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.03)",
                      display: "grid",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontWeight: 900 }}>
                        {prettyStore(o.store)} • {o.delivery_destination ?? "—"}
                      </div>
                      <div style={{ opacity: 0.9, fontWeight: 900 }}>{o.status}</div>
                    </div>

                    <div style={{ opacity: 0.85, fontSize: 13 }}>
                     {statusLabel(o.status, o.cancel_reason)}
                    </div>

                    <div style={{ opacity: 0.75, fontSize: 12 }}>
                      {o.status === "DELIVERED"
                        ? `Delivered on ${new Date(o.created_at).toLocaleString()}`
                        : `Placed ${new Date(o.created_at).toLocaleString()}`}
                    </div>

                    <div style={{ opacity: 0.6, fontSize: 12 }}>Tap to view live status</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <a href="/order" style={{ opacity: 0.9, textDecoration: "none" }}>
            + Start a new order
          </a>
        </div>
      </div>
    </main>
  );
}