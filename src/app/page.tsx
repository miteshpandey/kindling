'use client';

import { useEffect, useRef, useState } from 'react';
import Arrival from '@/components/Arrival';
import Compose from '@/components/Compose';
import Sent from '@/components/Sent';

type Phase = 'loading' | 'arrival' | 'compose' | 'sent';

// If /api/receive itself is unreachable, still show something warm.
const LOCAL_SAFETY = "Someone, somewhere is glad you're here today. Take care of yourself.";

export default function Page() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [received, setReceived] = useState<string>('');
  const [sentBody, setSentBody] = useState<string>('');
  const [sentCount, setSentCount] = useState<number | null>(null);

  // Guard against the receive call firing twice under React strict mode.
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/receive', { method: 'POST' });
        const data = await res.json();
        setReceived(data.body || LOCAL_SAFETY);
      } catch {
        setReceived(LOCAL_SAFETY);
      } finally {
        setPhase('arrival');
      }
    })();
  }, []);

  if (phase === 'loading') {
    return (
      <div className="screen s-arrival">
        <div className="glow glow-a glow-coral" />
        <div className="glow glow-b glow-pink" />
        <div className="glow glow-c glow-peach" />
        <div className="content">
          <div className="mark">
            <span className="dot" />
            kindling
          </div>
          <div className="loadwrap">
            <div className="loadline">finding one for you...</div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'arrival') {
    return <Arrival message={received} onLeave={() => setPhase('compose')} />;
  }

  if (phase === 'compose') {
    return (
      <Compose
        onSent={({ body, count }) => {
          setSentBody(body);
          setSentCount(count);
          setPhase('sent');
        }}
      />
    );
  }

  // Once here, there is no path back to compose in this session (the soft gate).
  // A real reload starts the whole thing over, which is intended.
  return <Sent message={sentBody} count={sentCount} />;
}
