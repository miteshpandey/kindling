'use client';

import { useRef, useState } from 'react';
import { MOODS } from '@/lib/moods';

type Props = {
  onSent: (payload: { body: string; count: number | null }) => void;
};

export default function Compose({ onSent }: Props) {
  const [mood, setMood] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [usingCustom, setUsingCustom] = useState(false);
  const [custom, setCustom] = useState('');
  const [failReason, setFailReason] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function pickMood(id: string) {
    setMood(id);
    setSelected(null);
    setUsingCustom(false);
    setCustom('');
    setFailReason(null);
    setLoading(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mood: id }),
      });
      const data = await res.json();
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function selectSuggestion(i: number) {
    setSelected(i);
    setUsingCustom(false);
    setCustom('');
    setFailReason(null);
  }

  function writeOwn() {
    setUsingCustom(true);
    setSelected(null);
    setFailReason(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function onCustomChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setCustom(e.target.value);
    setFailReason(null);
  }

  const canSend =
    selected !== null || (usingCustom && custom.trim().length > 0);

  async function send() {
    if (!canSend || sending) return;
    setSending(true);

    const isCustom = usingCustom;
    const body = isCustom ? custom.trim() : suggestions[selected as number];

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, mood, isCustom }),
      });
      const data = await res.json();

      if (data.ok) {
        onSent({ body, count: data.count ?? null });
        return;
      }
      if (data.reason === 'moderation') {
        setFailReason('moderation');
      } else {
        setFailReason('error');
      }
    } catch {
      setFailReason('error');
    } finally {
      setSending(false);
    }
  }

  const failText =
    failReason === 'moderation'
      ? "This one didn't pass. Try saying it another way."
      : failReason === 'error'
      ? "Couldn't send just now. Try again in a moment."
      : '';

  return (
    <div className="screen s-compose">
      <div className="glow glow-a glow-coral" />
      <div className="glow glow-b glow-pink" />
      <div className="glow glow-c glow-peach" />

      <div className="content compose-pad">
        <div className="mark">
          <span className="dot" />
          kindling
        </div>

        <div className="head">
          <div className="lead">someone will open this next</div>
          <div className="ask">What should they feel?</div>
        </div>

        <div className="moods">
          {MOODS.map((m) => (
            <button
              key={m.id}
              className={mood === m.id ? 'mood on' : 'mood'}
              onClick={() => pickMood(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="stream">
          {loading && <div className="loading">gathering three for you...</div>}

          {!loading && suggestions.length > 0 && (
            <div className="suggests">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className={selected === i ? 'sg-card on anim' : 'sg-card anim'}
                  style={{ animationDelay: `${i * 90}ms` }}
                  onClick={() => selectSuggestion(i)}
                >
                  <div className="sg-pick" />
                  <div className="sg-text">{s}</div>
                </button>
              ))}
            </div>
          )}

          {!loading && mood && (
            <div className="undernote">
              <button className="link" onClick={writeOwn}>
                or write your own
              </button>
            </div>
          )}

          {usingCustom && (
            <div className="writebox">
              <textarea
                ref={textareaRef}
                maxLength={240}
                placeholder="say it your way"
                value={custom}
                onChange={onCustomChange}
              />
              <div className="metarow">
                <span
                  className={failReason === 'moderation' ? 'validator fail' : 'validator'}
                  tabIndex={0}
                  aria-label="Custom notes are checked by AI before they reach a stranger."
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M9 12l2 2 4-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="vlabel">AI checked</span>
                  <span className="tip">Custom notes are checked by AI before they reach a stranger.</span>
                </span>
                <div className={failReason === 'moderation' ? 'count fail' : 'count'}>
                  {custom.length} / 240
                </div>
              </div>
              {failText && <div className="modmsg">{failText}</div>}
            </div>
          )}
        </div>

        <div className="foot">
          <button className="send" onClick={send} disabled={!canSend || sending}>
            {sending ? 'sending...' : 'send it to a stranger'}
          </button>
        </div>
      </div>
    </div>
  );
}
