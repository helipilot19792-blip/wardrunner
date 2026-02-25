"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Category = "Coffee" | "Snacks" | "Errands" | "Other";
type Store = "TIMS" | "CAFETERIA" | "GIFT" | "PHARMACY_OTC";

type CartItem = {
  id: string;
  name: string;
  qty: number;
  notes?: string; // ✅ per-line item notes
};

const timsQuickPicks: { id: string; name: string }[] = [
  { id: "dd", name: "Double Double (Med) — 2 cream, 2 sugar" },
  { id: "reg", name: "Regular Coffee (Med)" },
  { id: "latte", name: "Latte (Med)" },
  { id: "icecapp", name: "Iced Capp (Med)" },
  { id: "farmers", name: "Farmer’s Wrap" },
  { id: "bagel", name: "Everything Bagel + Cream Cheese" },
  { id: "timbits", name: "Timbits (10-pack)" },
  { id: "donut", name: "Boston Cream Donut" },
  { id: "muffin", name: "Blueberry Muffin" },
];

function uid() {
  return Math.random().toString(36).slice(2);
}

type LastOrderSnapshot = {
  store: Store;
  category: Category;
  items: Array<{ name: string; qty: number; notes?: string | null }>;
  tipCents?: number;
  itemCapCents?: number;
  deliveryDestination?: string;
  notes?: string | null;
  savedAt?: string;
};

export default function OrderPage() {
  const [category, setCategory] = useState<Category>("Coffee");
  const [store, setStore] = useState<Store>("TIMS");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customItem, setCustomItem] = useState("");

  const [lastOrder, setLastOrder] = useState<LastOrderSnapshot | null>(null);
  const [loadingLast, setLoadingLast] = useState(true);

  const header = useMemo(() => {
    const storeLabel =
      store === "TIMS"
        ? "Tim Hortons"
        : store === "CAFETERIA"
        ? "Cafeteria"
        : store === "GIFT"
        ? "Gift Shop"
        : "Pharmacy (OTC only)";
    return `${category} • ${storeLabel}`;
  }, [category, store]);

  function addItem(name: string) {
    setCart((prev) => [...prev, { id: uid(), name, qty: 1, notes: "" }]);
  }

  function updateQty(id: string, qty: number) {
    setCart((prev) =>
      prev.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x))
    );
  }

  // ✅ New: update notes for a specific cart line item
  function updateItemNotes(id: string, notes: string) {
    setCart((prev) => prev.map((x) => (x.id === id ? { ...x, notes } : x)));
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((x) => x.id !== id));
  }

  function applyLastOrder(snapshot: LastOrderSnapshot) {
    setCategory(snapshot.category);
    setStore(snapshot.store);
    setCart(
      (snapshot.items ?? []).map((i) => ({
        id: uid(),
        name: i.name,
        qty: i.qty,
        notes: i.notes ?? "",
      }))
    );
  }

  useEffect(() => {
    // Load last_order from profiles (Supabase Auth user must be signed in)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    (async () => {
      setLoadingLast(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setLastOrder(null);
        setLoadingLast(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("last_order")
        .eq("id", user.id)
        .single();

      if (!error && data?.last_order) {
        setLastOrder(data.last_order as LastOrderSnapshot);
      } else {
        setLastOrder(null);
      }

      setLoadingLast(false);
    })();
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 720, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>
              Start Order
            </h1>
            <div style={{ opacity: 0.8 }}>{header}</div>

            {/* Re-order last */}
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {!loadingLast && lastOrder && (
                <button
                  onClick={() => applyLastOrder(lastOrder)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid #333",
                    background: "rgba(255,255,255,0.04)",
                    color: "inherit",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ↺ Re-order last
                </button>
              )}
              {!loadingLast && !lastOrder && (
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  No saved last order yet.
                </div>
              )}
            </div>
          </div>
          <a href="/account" style={{ opacity: 0.85, textDecoration: "none" }}>
            ← Account
          </a>
        </div>

        {/* Category */}
        <section style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Category</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["Coffee", "Snacks", "Errands", "Other"] as Category[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: category === c ? "2px solid white" : "1px solid #333",
                  background: "transparent",
                  color: "inherit",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* Store */}
        <section style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Store</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(
              [
                ["TIMS", "Tim Hortons"],
                ["CAFETERIA", "Cafeteria"],
                ["GIFT", "Gift Shop"],
                ["PHARMACY_OTC", "Pharmacy (OTC)"],
              ] as [Store, string][]
            ).map(([s, label]) => (
              <button
                key={s}
                onClick={() => setStore(s)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: store === s ? "2px solid white" : "1px solid #333",
                  background: "transparent",
                  color: "inherit",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
            Only items the customer can pay for personally (no hospital errands like
            “move documents between stations”).
          </div>
        </section>

        {/* Quick picks */}
        {store === "TIMS" && (
          <section style={{ marginTop: 22 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Tim’s Quick Picks</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {timsQuickPicks.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem(p.name)}
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid #333",
                    background: "rgba(255,255,255,0.04)",
                    color: "inherit",
                    fontWeight: 800,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Custom item */}
        <section style={{ marginTop: 22 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Add a custom item</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={customItem}
              onChange={(e) => setCustomItem(e.target.value)}
              placeholder="e.g., Small coffee, 1 milk, 2 sugar"
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 14,
                border: "1px solid #333",
                background: "transparent",
                color: "inherit",
              }}
            />
            <button
              onClick={() => {
                if (!customItem.trim()) return;
                addItem(customItem.trim());
                setCustomItem("");
              }}
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
              Add
            </button>
          </div>
        </section>

        {/* Cart */}
        <section style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Cart</div>

          {cart.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No items yet. Add a quick pick above.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 10,
                    alignItems: "start",
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid #333",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  {/* ✅ Name + per-item notes */}
                  <div>
                    <div style={{ fontWeight: 800 }}>{item.name}</div>

                    <input
                      value={item.notes ?? ""}
                      onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      placeholder="Item notes (e.g., no sauce, no sugar, extra napkins)"
                      style={{
                        marginTop: 8,
                        width: "100%",
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid #333",
                        background: "transparent",
                        color: "inherit",
                        fontSize: 13,
                        opacity: 0.95,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 2 }}>
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: "1px solid #333",
                        background: "transparent",
                        color: "inherit",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      –
                    </button>
                    <div style={{ minWidth: 22, textAlign: "center", paddingTop: 6 }}>
                      {item.qty}
                    </div>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: "1px solid #333",
                        background: "transparent",
                        color: "inherit",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid #333",
                      background: "transparent",
                      color: "inherit",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button
              disabled={cart.length === 0}
              onClick={() => {
                // ✅ notes are already included in cart items, so this draft keeps them
                const payload = { category, store, cart };
                sessionStorage.setItem("wardrunner_draft", JSON.stringify(payload));
                window.location.href = "/order/review";
              }}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                background: cart.length ? "white" : "#444",
                color: cart.length ? "black" : "#999",
                fontWeight: 900,
                border: "none",
                cursor: cart.length ? "pointer" : "not-allowed",
              }}
            >
              Review →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}