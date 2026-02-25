// app/api/runner/clear-all/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function createSupabase(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabase(req);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Not authenticated", details: userErr?.message ?? null },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update({
        status: "CANCELLED",
        cancelled_at: now,
        cancelled_by: user.id,
        cancelled_reason: "Emergency clear-all",
        cancelled_meta: { type: "EMERGENCY_CLEAR_ALL" },
      })
      .in("status", ["QUEUED", "ACCEPTED"]);    

    if (error) {
      return NextResponse.json(
        { error: error.message, code: (error as any)?.code ?? null, hint: (error as any)?.hint ?? null },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server crash", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}