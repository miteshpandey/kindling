import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
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