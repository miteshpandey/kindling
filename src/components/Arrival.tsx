'use client';

import { useState } from 'react';

type Props = {
  message: string;
  onLeave: () => void;
};

export default function Arrival({ message, onLeave }: Props) {
  const [helped, setHelped] = useState(false);

  return (
    <div className="screen s-arrival">
      <div className="glow glow-a glow-coral" />
      <div className="glow glow-b glow-pink" />
      <div className="glow glow-c glow-peach" />

      <div className="content">
        <div className="mark arr-fade">
          <span className="dot" />
          kindling
        </div>

        <div className="arr-wrap">
          <div className="msg-card arr-anim">
            <div className="msg-from">someone left this for you</div>
            <p className="msg-text">{message}</p>
            <div className="msg-attrib">from a stranger, to you</div>
          </div>
        </div>

        <div className="actions arr-fade">
          <button
            className={helped ? 'helped on' : 'helped'}
            onClick={() => setHelped(true)}
            disabled={helped}
          >
            {helped ? 'thank you' : 'this helped'}
          </button>
          <button className="pass" onClick={onLeave}>
            leave one for the next person
          </button>
        </div>
      </div>
    </div>
  );
}
