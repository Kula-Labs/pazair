import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The agent that buys what it cannot do',
  description: 'A Vercel AI SDK agent with PazAIr as a tool: ask the market, rehearse a purchase without money, verify the receipt.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
