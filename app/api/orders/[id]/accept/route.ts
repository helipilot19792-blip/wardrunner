// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateOrderBody = {
  store: "TIMS" | "CAFETERIA" | "GIFT" | "PHARMACY_OTC";
  category: "Coffee" | "Snacks" | "Errands" | "Other";
  deliveryDestination: string;
  notes?: string;
  tipCents?: number;
  itemCapCents?: number;
  items: Array<{ name: string; qty: number; notes?: string }>;
};

export async function POST(req: Request) {
  try {
    const supabase = createClient();

    let body: CreateOrderBody;
    try {
      body = (await req.json()) as CreateOrderBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Auth
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Not authenticated", details: userErr?.message ?? null },
        { status: 401 }
      );
    }

    // Validate
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }
    if (!body.store || !body.deliveryDestination) {
      return NextResponse.json(
        { error: "Missing required fields", details: { store: body.store, deliveryDestination: body.deliveryDestination } },
        { status: 400 }
      );
    }

    // Insert order
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

    // Insert items
    const itemsToInsert = body.items.map((i) => ({
      order_id: order.id,
      name: i.name,
      qty: i.qty,
      notes: i.notes ?? null,
      modifiers: {},
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemsToInsert);

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

    return NextResponse.json({ orderId: order.id }, { status: 200 });
  } catch (e: any) {
    // If anything unexpected happens, return a real error instead of hanging.
    return NextResponse.json(
      { error: "Server crash", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}