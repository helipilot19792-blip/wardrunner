"use client";
export const dynamic = "force-dynamic";
import { Suspense } from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Category = "Coffee" | "Snacks" | "Errands" | "Other";
type Store = "TIMS" | "CAFETERIA" | "GIFT" | "PHARMACY_OTC";

type CartItem = {
  id: string;
  name: string;
  qty: number;
  notes?: string;
};

type Draft = {
  category: Category;
  store: Store;
  cart: CartItem[];
};

// storage keys
const STORAGE_KEY_OLD = "wardrunner_draft";
const STORAGE_KEY_V2 = "wardrunner_draft_v2";

const timsQuickPicks: { id: string; name: string; img: string; tag?: string }[] = [
  { id: "dd", name: "Double Double (Med) — 2 cream, 2 sugar", img: "/quickpicks/double-double.jpg", tag: "Popular" },
  { id: "icecapp", name: "Iced Capp (Med)", img: "/quickpicks/iced-capp.jpg", tag: "Cold" },
  { id: "farmers", name: "Farmer’s Wrap", img: "/quickpicks/farmers-wrap.jpg", tag: "Hot" },

  { id: "reg", name: "Regular Coffee (Med)", img: "/quickpicks/regular-coffee.jpg" },
  { id: "latte", name: "Latte (Med)", img: "/quickpicks/latte.jpg" },
  { id: "bagel", name: "Everything Bagel + Cream Cheese", img: "/quickpicks/bagel.jpg" },
  { id: "timbits", name: "Timbits (10-pack)", img: "/quickpicks/timbits.jpg" },
  { id: "donut", name: "Boston Cream Donut", img: "/quickpicks/boston-cream.jpg" },
  { id: "muffin", name: "Blueberry Muffin", img: "/quickpicks/blueberry-muffin.jpg" },
];

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function OrderPageInner() {
  const searchParams = useSearchParams();
  const draftIdFromUrl = searchParams.get("draftId"); // may exist from review page v2

  const [category, setCategory] = useState<Category>("Coffee");
  const [store, setStore] = useState<Store>("TIMS");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customItem, setCustomItem] = useState("");
  const [toast, setToast] = useState<{ text: string; ts: number } | null>(null);
  const [lastAddedTs, setLastAddedTs] = useState<number>(0);
  const cartRef = useRef<HTMLDivElement | null>(null);

  // Track viewport width for responsive grid
  const [vw, setVw] = useState<number>(9999);

  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = vw < 700;
  const isTiny = vw < 380;

  // ✅ On mount: rehydrate from sessionStorage if a draft exists
  useEffect(() => {
    // Prefer v2 if present
    const v2Raw = sessionStorage.getItem(STORAGE_KEY_V2);
    if (v2Raw) {
      try {
        const parsed = JSON.parse(v2Raw) as { draftId?: string; draft?: Draft };
        if (parsed?.draft) {
          setCategory(parsed.draft.category);
          setStore(parsed.draft.store);
          setCart(parsed.draft.cart ?? []);
          return;
        }
      } catch {
        // ignore
      }
    }

    // Back-compat: old key
    const oldRaw = sessionStorage.getItem(STORAGE_KEY_OLD);
    if (oldRaw) {
      try {
        const parsed = JSON.parse(oldRaw) as Draft;
        setCategory(parsed.category);
        setStore(parsed.store);
        setCart(parsed.cart ?? []);
      } catch {
        // ignore
      }
    }
  }, [draftIdFromUrl]);

  // ✅ Persist draft continuously so "Edit" never wipes
  useEffect(() => {
    const payload: Draft = { category, store, cart };

    // always keep old key updated (so review page still works)
    sessionStorage.setItem(STORAGE_KEY_OLD, JSON.stringify(payload));

    // if v2 exists, update it too (review page can use it)
    const v2Raw = sessionStorage.getItem(STORAGE_KEY_V2);
    if (v2Raw) {
      try {
        const parsed = JSON.parse(v2Raw) as any;
        const updated = { ...parsed, draft: payload };
        sessionStorage.setItem(STORAGE_KEY_V2, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  }, [category, store, cart]);

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

    const ts = Date.now();
    setLastAddedTs(ts);
    setToast({ text: `Added: ${name}`, ts });

    window.setTimeout(() => {
      setToast((cur) => (cur?.ts === ts ? null : cur));
    }, 1200);
  }

  function updateQty(id: string, qty: number) {
    setCart((prev) => prev.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  }

  function updateNotes(id: string, notes: string) {
    setCart((prev) => prev.map((x) => (x.id === id ? { ...x, notes } : x)));
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 720, padding: 24 }}>
        {/* Floating confirmation + cart count */}
        <div
          style={{
            position: "fixed",
            top: 14,
            right: 14,
            zIndex: 9999,
            display: "grid",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          {/* Cart count pill */}
          <button
            style={{
              pointerEvents: "auto",
              justifySelf: "end",
              padding: "8px 10px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
              color: "white",
              fontWeight: 900,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transform: Date.now() - lastAddedTs < 900 ? "scale(1.05)" : "scale(1)",
              transition: "transform 160ms ease",
            }}
          >
            🛒 {cart.reduce((sum, x) => sum + x.qty, 0)} item{cart.reduce((sum, x) => sum + x.qty, 0) === 1 ? "" : "s"}
        </button>

        {/* Toast */}
        {toast ? (
          <div
            style={{
              justifySelf: "end",
              maxWidth: 280,
              padding: "10px 12px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.20)",
              backdropFilter: "blur(10px)",
              color: "white",
              fontWeight: 900,
              fontSize: 13,
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
            }}
          >
            ✅ {toast.text}
          </div>
        ) : null}
      </div>
      {/* ✅ WOW HERO HEADER */}
      <div
        style={{
          marginTop: 6,
          padding: 18,
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            "radial-gradient(1200px 400px at 20% 0%, rgba(120,180,255,0.18) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0) 70%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <img
              src="/brand/wardrunner-logo.png"
              alt="WardRunner"
              style={{ width: 44, height: 44, borderRadius: 12 }}
            />
            <div>
              <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -0.3 }}>WardRunner</div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>
                Internal prototype • Niagara Health • Marotta Family Hospital
              </div>
            </div>
          </div>

          <a href="/account" style={{ opacity: 0.9, textDecoration: "none", fontWeight: 800 }}>
            Account →
          </a>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 34, fontWeight: 950, letterSpacing: -0.6, lineHeight: 1.05 }}>
            Coffee, snacks & quick errands —
            <span style={{ opacity: 0.9 }}> delivered inside the hospital.</span>
          </div>

          <div style={{ marginTop: 10, opacity: 0.8, fontSize: 14 }}>
            Build your order in seconds. A runner accepts it, shops, and brings it to your unit.
          </div>

          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
            Current selection: <span style={{ fontWeight: 900 }}>{header}</span>
          </div>
        </div>
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
                border: category === c ? "2px solid white" : "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.03)",
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
                border: store === s ? "2px solid white" : "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.03)",
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
          Only items the customer can pay for personally (no hospital errands like “move documents between stations”).
        </div>
      </section>

      {/* Quick picks */}
      {store === "TIMS" && (
        <section style={{ marginTop: 22 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Tim’s Quick Picks</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTiny ? "1fr" : isMobile ? "1fr 1fr" : "1fr 1fr",
              gap: isMobile ? 10 : 12,
            }}
          >
            {timsQuickPicks.map((p) => (
              <div
                key={p.id}
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.03)",
                  overflow: "hidden",
                  boxShadow: "0 14px 30px rgba(0,0,0,0.28)",
                  transform: "translateY(0px)",
                  transition: "transform 160ms ease, box-shadow 160ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 18px 40px rgba(0,0,0,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0px)";
                  e.currentTarget.style.boxShadow = "0 14px 30px rgba(0,0,0,0.28)";
                }}
              >
                <div style={{ position: "relative", height: isMobile ? 86 : 130 }}>
                  <img
                    src={p.img}
                    alt={p.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.65) 100%)",
                    }}
                  />

                  {p.tag ? (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.14)",
                        border: "1px solid rgba(255,255,255,0.22)",
                        fontSize: 12,
                        fontWeight: 900,
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      {p.tag}
                    </div>
                  ) : null}
                </div>

                <div style={{ padding: isMobile ? 10 : 12 }}>
                  <div style={{ fontWeight: 950, letterSpacing: -0.2 }}>{p.name}</div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ opacity: 0.7, fontSize: 12 }}>Tap to add to cart</div>

                    <button
                      onClick={() => addItem(p.name)}
                      style={{
                        padding: isMobile ? "8px 10px" : "10px 12px",
                        borderRadius: 999,
                        background: "white",
                        color: "black",
                        fontWeight: 950,
                        border: "none",
                        cursor: "pointer",
                        minWidth: isMobile ? 76 : 92,
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Custom item */}
      <section style={{ marginTop: 22 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Add a custom item</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={customItem}
            onChange={(e) => setCustomItem(e.target.value)}
            placeholder="e.g., Small coffee, 1 milk, 2 sugar"
            style={{
              flex: 1,
              minWidth: 220,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.03)",
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
              fontWeight: 950,
              border: "none",
              cursor: "pointer",
              minWidth: 110,
            }}
          >
            Add
          </button>
        </div>
      </section>

      {/* Cart */}
      <div ref={cartRef} />
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
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 850 }}>{item.name}</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(255,255,255,0.03)",
                        color: "inherit",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      –
                    </button>
                    <div style={{ minWidth: 22, textAlign: "center" }}>{item.qty}</div>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(255,255,255,0.03)",
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
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.03)",
                      color: "inherit",
                      fontWeight: 850,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>

                {/* Per-item notes */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>Item notes (optional)</div>
                  <input
                    value={item.notes ?? ""}
                    onChange={(e) => updateNotes(item.id, e.target.value)}
                    placeholder='e.g., "Goat milk", "No sugar", "Extra napkins"'
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.03)",
                      color: "inherit",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button
            disabled={cart.length === 0}
            onClick={() => {
              const payload: Draft = { category, store, cart };
              sessionStorage.setItem(STORAGE_KEY_OLD, JSON.stringify(payload));
              window.location.href = "/order/review?from=builder";
            }}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              background: cart.length ? "white" : "rgba(255,255,255,0.12)",
              color: cart.length ? "black" : "rgba(255,255,255,0.5)",
              fontWeight: 950,
              border: "none",
              cursor: cart.length ? "pointer" : "not-allowed",
            }}
          >
            Review →
          </button>
        </div>
      </section>
    </div>
    </main >
  );
}
export default function OrderPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <OrderPageInner />
    </Suspense>
  );
}