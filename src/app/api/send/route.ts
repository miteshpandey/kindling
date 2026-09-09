import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { moderateMessage } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { body, mood, isCustom } = await req.json().catch(() => ({}));
  const text = (body || '').toString().trim();

  if (!text) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });
  if (text.length > 240) return NextResponse.json({ ok: false, reason: 'too_long' }, { status: 400 });

  // Only custom text is checked. Ready-made suggestions are pre-vetted.
  // The client tells us which path it took; the server still owns the gate.
  if (isCustom) {
    const verdict = await moderateMessage(text);
    if (!verdict.allowed) {
      return NextResponse.json({ ok: false, reason: 'moderation' });
    }
  }

  const supabase = getServerClient();

  const { error: insErr } = await supabase
    .from('messages')
    .insert({ body: text, mood: mood || null, source: 'user' });
  if (insErr) return NextResponse.json({ ok: false, reason: 'db' }, { status: 500 });

  const { data: count } = await supabase.rpc('increment_daily_counter');
  return NextResponse.json({ ok: true, count: count ?? null });
}
