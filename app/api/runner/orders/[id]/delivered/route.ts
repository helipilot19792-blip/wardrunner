import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // ✅ Required in Next 16 (params is async)
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing order id" },
        { status: 400 }
      );
    }

    // 🔐 Auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 🚚 Mark as delivered
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "DELIVERED",
      })
      .eq("id", id)
      .eq("runner_id", user.id) // only the assigned runner can mark delivered
      .in("status", ["ACCEPTED", "SHOPPING", "DELIVERING"]);

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}