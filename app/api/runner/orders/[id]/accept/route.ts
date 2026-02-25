import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // ✅ Required in Next 16 — params is async
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    // 🔐 Auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 🚀 Accept order (atomic: only succeeds if still unassigned)
    const { data, error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "ACCEPTED",
        runner_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("runner_id", null) // ✅ race-condition guard
      .in("status", ["QUEUED", "PENDING_ACCEPTANCE"])
      .select("id")
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    if (!data) {
      // ✅ 0 rows updated => someone else accepted first
      return NextResponse.json(
        { error: "Order already accepted" },
        { status: 409 }
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