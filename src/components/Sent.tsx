'use client';

import { useState } from 'react';

type Props = {
  message: string;
  count: number | null;
};

export default function Sent({ message, count }: Props) {
  const [closed, setClosed] = useState(false);

  const stat =
    count && count > 1 ? (
      <>
        you&apos;re one of <b>{count.toLocaleString()}</b> people who left a little light today
      </>
    ) : (
      <>you&apos;re the first to leave a little light today</>
    );

  return (
    <div className="screen s-sent">
      <div className="glow glow-a glow-coral" />
      <div className="glow glow-b glow-pink" />
      <div className="glow glow-c glow-peach" />

      <div className={closed ? 'content fade-out' : 'content'}>
        <div className="mark">
          <span className="dot" />
          kindling
        </div>

        <div className="middle">
          <div>
            <div className="sent-label">on its way to someone</div>
            <div className="sent-card sent-depart">
              <p className="sent-text">{message}</p>
            </div>
            <div className="sent-sub">they&apos;ll open it not knowing it was you</div>
          </div>

          <p className="stat fu-1">{stat}</p>
        </div>

        <div className="close fu-2">
          <div className="close-head">That&apos;s all for today.</div>
          <div className="close-sub">The rest of the day is yours.</div>
          <button className="close-btn" onClick={() => setClosed(true)}>
            close kindling
          </button>
        </div>
      </div>

      <div className={closed ? 'end show' : 'end'}>
        <div className="emark">
          <span className="edot" />
          kindling
        </div>
        <div className="bye">see you tomorrow</div>
      </div>
    </div>
  );
}
