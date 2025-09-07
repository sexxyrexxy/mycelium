'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import * as Tone from 'tone'; // type-safe access, optional but handy
import { loadCsv, start as startSonification, stop as stopSonification } from '@/components/portfolio/sonification/sonify';

type Props = {
  csvUrl?: string; // e.g., "/GhostFungi.csv"
};

export function SonificationPanel({ csvUrl = '/GhostFungi.csv' }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const onStart = async () => {
    if (busy) return;
    try {
      setBusy(true);
      // unlock audio (must be inside this click)
      await Tone.start();
      const ctx = Tone.getContext().rawContext;
      if (ctx.state !== 'running') await ctx.resume();

      if (!loaded) {
        const sum = await loadCsv(csvUrl);
        console.log('CSV summary:', sum);
        setLoaded(true);
      }

      await startSonification({
        timeCompression: 50,
        smoothingWindow: 5,
        controlRateHz: 100,
        freqMin: 220,
        freqMax: 660,
        cutoffMin: 300,
        cutoffMax: 5000,
      });
    } catch (err: any) {
      alert(`Failed: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const onStop = () => {
    try { stopSonification(); } catch {}
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hear It!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Play the mushroom’s electrical signals as sound. Source: <code>{csvUrl}</code>
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
            className="px-3 py-1.5 rounded-md bg-rose-500 text-white hover:bg-rose-600"
          >
            Stop
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
