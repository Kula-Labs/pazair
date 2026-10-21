'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const HINTS = [
  'Create a Swiss QR bill for CHF 120 to Example AG, Bahnhofstrasse 1, 8001 Zürich',
  'Translate our shop description into legal French',
  'Show me what a purchase looks like, without money',
];

function short(v: unknown, max = 900): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v, null, 1);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export default function Page() {
  const { messages, sendMessage, status } = useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }) });
  const [input, setInput] = useState('');
  const busy = status !== 'ready';
  const send = (text: string) => {
    if (!text.trim() || busy) return;
    void sendMessage({ text });
    setInput('');
  };

  return (
    <main>
      <h1>The agent that buys what it cannot do</h1>
      <p className="lead">
        A Vercel AI SDK agent with <a href="https://pazair.kulalabs.ch">PazAIr</a> as a tool. When it cannot do a task, it asks the market instead of guessing. Here it only rehearses a purchase, without money; the receipt is signed for real and checked below.
      </p>
      {messages.length === 0 && (
        <div className="hints">
          {HINTS.map((h) => (
            <button key={h} type="button" onClick={() => send(h)} disabled={busy}>
              {h}
            </button>
          ))}
        </div>
      )}
      {messages.map((m) => (
        <div key={m.id} className={`msg ${m.role}`}>
          <div className="who">{m.role === 'user' ? 'You' : 'Agent'}</div>
          {m.parts.map((part, i) => {
            if (part.type === 'text') return <span key={i}>{part.text}</span>;
            if (part.type.startsWith('tool-')) {
              const p = part as { type: string; state: string; input?: unknown; output?: unknown; errorText?: string };
              const name = p.type.slice(5);
              return (
                <div key={i} className="tool">
                  <b>{name}</b> {p.state}
                  {p.input !== undefined && `\n→ ${short(p.input, 300)}`}
                  {p.state === 'output-available' && `\n← ${short(p.output)}`}
                  {p.state === 'output-error' && `\n✕ ${p.errorText}`}
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="row">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="What do you need done?" aria-label="Your task" disabled={busy} />
          <button type="submit" disabled={busy || !input.trim()}>
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
