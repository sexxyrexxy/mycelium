'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { loadCsv, startPiano, stopPiano } from '@/components/portfolio/sonification/sonify';

type Props = { csvUrl?: string };

export function SonificationPanel({ csvUrl = '/GhostFungi.csv' }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  // Global unlock fallback: resume context on first interaction anywhere
  useEffect(() => {
    const handler = async () => {
      try {
        const Tone = await import('tone');
        await Tone.start();
        const ctx = Tone.getContext().rawContext;
        if (ctx.state !== 'running') await ctx.resume();
      } catch {}
      window.removeEventListener('pointerdown', handler as any, true);
      window.removeEventListener('keydown', handler as any, true);
    };
    window.addEventListener('pointerdown', handler as any, true);
    window.addEventListener('keydown', handler as any, true);
    return () => {
      window.removeEventListener('pointerdown', handler as any, true);
      window.removeEventListener('keydown', handler as any, true);
    };
  }, []);

  // Stop any scheduled audio when the component unmounts
  useEffect(() => {
    return () => {
      try { stopPiano(); } catch {}
    };
  }, []);

  const onStart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Import Tone only on user click to avoid autoplay warnings on page load
      const Tone = await import('tone');
      await Tone.start();
      const ctx = Tone.getContext().rawContext;
      if (ctx.state !== 'running') await ctx.resume();
      // Snappier first note
      Tone.getContext().lookAhead = 0.02;

      // Load the CSV once
      if (!loaded) {
        const summary = await loadCsv(csvUrl);
        console.log('CSV summary:', summary);
        setLoaded(true);
      }

      // Start piano sonification with sane defaults (audible notes)
      await startPiano({
        timeCompression: 5,
        smoothingWindow: 5,
        stepRateHz: 3,
        scaleMidiLow: 48,   // C3
        scaleMidiHigh: 84,  // C6
        velocity: 0.9,
        noteLenSec: 0.25,
        reverbWet: 0.2,
      });
    } catch (e: any) {
      alert(`Failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const onStop = () => {
    try { stopPiano(); } catch {}
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hear It!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Play the mushroom’s electrical signals as a piano. Source: <code>{csvUrl}</code>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onStart}
            className="px-3 py-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? 'Starting…' : 'Start'}
          </button>
          <button
            onClick={onStop}
            className="px-3 py-1.5 rounded-md bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50"
            disabled={busy}
          >
            Stop
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
