import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { generateSuggestions } from '@/lib/gemini';
import { findMood } from '@/lib/moods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function shuffle<T>(a: T[]): T[] {
  return a
    .map((v) => [Math.random(), v] as const)
    .sort((x, y) => x[0] - y[0])
    .map((p) => p[1]);
}

export async function POST(req: Request) {
  const { mood } = await req.json().catch(() => ({ mood: null }));
  const moodDef = findMood(mood);
  if (!moodDef) return NextResponse.json({ error: 'invalid mood' }, { status: 400 });

  const supabase = getServerClient();

  try {
    // Live generation.
    const suggestions = await generateSuggestions(moodDef);

    // Save the fresh lines into the fallback pool so it grows over time.
    // Best effort: if this insert fails, the sender is unaffected.
    try {
      await supabase
        .from('fallback_messages')
        .insert(suggestions.map((body) => ({ body, mood: moodDef.id, origin: 'generated' })));
    } catch {
      /* ignore */
    }

    return NextResponse.json({ suggestions, source: 'model' });
  } catch {
    // Model rate-limited or unreachable: draw three from the fallback pool.
    let pool: string[] = [];

    const { data: byMood } = await supabase
      .from('fallback_messages')
      .select('body')
      .eq('mood', moodDef.id);
    pool = (byMood || []).map((r) => r.body);

    if (pool.length < 3) {
      const { data: any } = await supabase.from('fallback_messages').select('body');
      pool = (any || []).map((r) => r.body);
    }

    const picks = shuffle(pool).slice(0, 3);
    if (picks.length === 0) picks.push('Hope today is gentle with you.');

    return NextResponse.json({ suggestions: picks, source: 'fallback' });
  }
}
