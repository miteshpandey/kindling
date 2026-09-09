import type { Mood } from './moods';

// Google Gemini Developer API (AI Studio key).
// Model id confirmed against Google's docs. Swap it here if you move models:
// https://ai.google.dev/gemini-api/docs/models
const MODEL = 'gemini-3.5-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function callGemini(system: string, user: string, maxTokens = 800): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json', // ask the model for clean JSON
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error ${res.status}`);

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  // On Gemini 3.x some parts can be internal "thought" summaries; keep only real text.
  const text = parts
    .filter((p: any) => typeof p.text === 'string' && !p.thought)
    .map((p: any) => p.text)
    .join('')
    .trim();

  if (!text) throw new Error('Empty completion');
  return text;
}

function extractJson(raw: string): any {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

// Three warm, short notes tailored to the chosen mood.
export async function generateSuggestions(mood: Mood): Promise<string[]> {
  const system = [
    'You write short anonymous notes that a stranger will open in an app and read exactly one of.',
    'Voice: warm, human, specific, a little understated. Never saccharine, preachy, or coach-like.',
    'Rules: 1 to 2 sentences each. No emojis. No names. No hashtags.',
    'Avoid cliches like "you\'ve got this" or "stay strong".',
    'Return ONLY a JSON array of exactly 3 strings. No markdown, no commentary.',
  ].join(' ');

  const user = `Mood: ${mood.label}. Intent: ${mood.brief}. Write 3 distinct options.`;

  const raw = await callGemini(system, user, 800);
  const parsed = extractJson(raw);
  if (!Array.isArray(parsed)) throw new Error('Unexpected shape from model');

  const out = parsed.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 3);
  if (out.length < 3) throw new Error('Model returned fewer than 3 suggestions');
  return out;
}

// The real gate into the live pool. Only custom text is checked.
export async function moderateMessage(text: string): Promise<{ allowed: boolean; reason: string }> {
  const system = [
    'You are the safety gate for anonymous messages sent to strangers who cannot reply.',
    'Block: harassment, insults, hate toward any group, threats or violence, sexual content,',
    'anything that encourages self-harm, personal contact details, links, spam, or advertising.',
    'Allow: warm, supportive, neutral, or gently funny notes.',
    'When unsure, block.',
    'Return ONLY JSON: {"allowed": boolean, "reason": string}. Keep reason to a few words; empty string when allowed.',
  ].join(' ');

  try {
    const raw = await callGemini(system, text, 300);
    const parsed = extractJson(raw);
    return { allowed: Boolean(parsed.allowed), reason: String(parsed.reason || '') };
  } catch {
    // Fail closed: if the classifier is unreachable, do not let the text through.
    return { allowed: false, reason: 'check unavailable' };
  }
}
