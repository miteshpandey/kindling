import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Absolute last resort so the receive screen is never blank.
const SAFETY_NET = {
  body: "Someone, somewhere is glad you're here today. Take care of yourself.",
  mood: 'hi',
};

export async function POST() {
  try {
    const supabase = getServerClient();

    // 1. Try to claim a real message from the live pool (atomic).
    const { data: claimed, error: claimErr } = await supabase.rpc('claim_live_message');
    if (!claimErr && Array.isArray(claimed) && claimed.length > 0) {
      return NextResponse.json({ body: claimed[0].body, mood: claimed[0].mood, source: 'live' });
    }

    // 2. Live pool empty: draw a random fallback (never consumed).
    //    Small tables, so pulling and picking in JS is fine. At scale, move
    //    the random pick into a SQL function like claim_live_message.
    const { data: fb } = await supabase.from('fallback_messages').select('body, mood');
    if (fb && fb.length > 0) {
      const pick = fb[Math.floor(Math.random() * fb.length)];
      return NextResponse.json({ body: pick.body, mood: pick.mood, source: 'fallback' });
    }

    return NextResponse.json({ ...SAFETY_NET, source: 'safety' });
  } catch {
    return NextResponse.json({ ...SAFETY_NET, source: 'safety' });
  }
}
