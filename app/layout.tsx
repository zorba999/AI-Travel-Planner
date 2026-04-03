import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Travel Planner — Powered by OpenGradient',
  description: 'Get a personalized day-by-day travel itinerary powered by verified AI on OpenGradient',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
