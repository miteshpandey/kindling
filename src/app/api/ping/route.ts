import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getServerClient();

  // Cheapest possible query that actually touches the DB
  const { error } = await supabase
    .from("fallback_messages")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, time: new Date().toISOString() });
}