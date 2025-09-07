'use client';

import { useState } from 'react';
import Script from 'next/script';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type Props = {
  /** Path to your CSV in /public (case-sensitive). Example: "/GhostFungi.csv" */
  csvUrl?: string;
};

declare global {
  interface Window {
    Tone: any;
    Sonify?: {
      loadData: (csvUrl: string) => Promise<{ rows: number; tStart: number; tEnd: number }>;
      startSonification: (opts?: any) => Promise<void>;
      stopSonification: () => void;
    };
  }
}

export function SonificationPanel({ csvUrl = '/GhostFungi.csv' }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const onStart = async () => {
    if (busy) return;
    try {
      setBusy(true);

      if (!window.Sonify) throw new Error('Sonify not loaded (check /public/sonify.js).');
      if (!window.Tone) throw new Error('Tone.js not loaded.');

      // 1) Unlock audio (must happen inside this click)
      await window.Tone.start();
      const ctx = window.Tone.getContext().rawContext;
      if (ctx.state !== 'running') await ctx.resume();

      // 2) Load CSV if not already loaded
      if (!loaded) {
        const sum = await window.Sonify.loadData(csvUrl);
        console.log('CSV summary:', sum);
        setLoaded(true);
      }

      // 3) Start sonification with fixed defaults
      await window.Sonify.startSonification({
        timeCompression: 50,
        smoothingWindow: 5,
        controlRateHz: 100,
        freqMin: 220,
        freqMax: 660,
        cutoffMin: 300,
        cutoffMax: 5000,
        rampSeconds: 0.02,
      });
    } catch (err: any) {
      alert(`Failed: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const onStop = () => {
    try { window.Sonify?.stopSonification(); } catch {}
  };

  return (
    <>
      {/* Load Tone.js and your global sonify script from /public */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js" strategy="afterInteractive" />
      <Script src="/sonify.js" strategy="afterInteractive" />

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
    </>
  );
}

