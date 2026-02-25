// app/api/orders/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type CreateOrderBody = {
  store: "TIMS" | "CAFETERIA" | "GIFT" | "PHARMACY_OTC";
  category: "Coffee" | "Snacks" | "Errands" | "Other";
  deliveryDestination: string;
  notes?: string;
  tipCents?: number;
  itemCapCents?: number;
  items: Array<{ name: string; qty: number; notes?: string }>;
};

function createSupabase(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        // no-ops are fine for this POST handler
        set() {},
        remove() {},
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabase(req);
    const body = (await req.json()) as CreateOrderBody;

    const { data, error: userErr } = await supabase.auth.getUser();
    const user = data?.user;

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Not authenticated", details: userErr?.message ?? null },
        { status: 401 }
      );
    }

    if (!body.items?.length) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        created_by: user.id,
        store: body.store,
        order_type: "INDIVIDUAL",
        status: "QUEUED",
        delivery_destination: body.deliveryDestination,
        notes: body.notes ?? null,
        tip_cents: body.tipCents ?? 0,
        item_cap_cents: body.itemCapCents ?? 0,
        delivery_fee_cents: null,
      })
      .select("*")
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        {
          error: "Order insert failed",
          details: orderErr?.message ?? "Unknown error",
          code: (orderErr as any)?.code ?? null,
          hint: (orderErr as any)?.hint ?? null,
        },
        { status: 400 }
      );
    }

    const itemsToInsert = body.items.map((i) => ({
      order_id: order.id,
      name: i.name,
      qty: i.qty,
      notes: i.notes ?? null,
      modifiers: {},
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsErr) {
      return NextResponse.json(
        {
          error: "Items insert failed",
          details: itemsErr.message,
          code: (itemsErr as any)?.code ?? null,
          hint: (itemsErr as any)?.hint ?? null,
        },
        { status: 400 }
      );
    }

    // ✅ Save "last order" snapshot to the user's profile (for Re-order)
    const lastOrderSnapshot = {
      store: body.store,
      category: body.category,
      items: body.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        notes: i.notes ?? null,
      })),
      tipCents: body.tipCents ?? 0,
      itemCapCents: body.itemCapCents ?? 0,
      deliveryDestination: body.deliveryDestination,
      notes: body.notes ?? null,
      savedAt: new Date().toISOString(),
    };

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        email: user.email ?? null,
        last_order: lastOrderSnapshot,
      })
      .eq("id", user.id);

    // Prototype-friendly: don't fail the order if profile saving fails
    if (profileErr) {
      console.warn("Failed to save last_order to profile:", profileErr.message);
    }

    return NextResponse.json({ orderId: order.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server crash", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}