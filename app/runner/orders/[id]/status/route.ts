import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await context.params;

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const status = body?.status as string | undefined;

  const allowed = new Set(["SHOPPING", "DELIVERING", "DELIVERED"]);
  if (!status || !allowed.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const patch: any = { status };
  if (status === "DELIVERED") patch.delivered_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .eq("runner_id", user.id)
    .select("id,status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Order not assigned to you" },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, order: data });
}