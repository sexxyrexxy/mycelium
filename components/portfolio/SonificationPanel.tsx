// components/portfolio/sonification/SonificationPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type Props = { csvUrl?: string };

export function SonificationPanel({ csvUrl = '/GhostFungi.csv' }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = async () => {
      try {
        const Tone = await import('tone');
        await Tone.start();
        const ctx = Tone.getContext().rawContext;
        if (ctx.state !== 'running') await ctx.resume();
      } catch (e) {
        console.error('Audio context unlock failed', e);
      }
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

  useEffect(() => {
    return () => {
      (async () => {
        try {
          const mod = await import('@/components/portfolio/sonification/sonify');
          if (typeof mod.stopAll === 'function') mod.stopAll();
        } catch (e) {
          console.error('Failed to stop audio on unmount', e);
        }
      })();
    };
  }, []);

  const ensureLoaded = async () => {
    const Tone = await import('tone');
    await Tone.start();
    const ctx = Tone.getContext().rawContext;
    if (ctx.state !== 'running') await ctx.resume();
    Tone.getContext().lookAhead = 0.02;

    if (!loaded) {
      const { loadCsv } = await import('@/components/portfolio/sonification/sonify');
      const summary = await loadCsv(csvUrl);
      console.log('CSV summary:', summary);
      setLoaded(true);
    }
  };

  const runEngine = async (
    key: 'startPiano' | 'startAmbient' | 'startChoir',
    args: any
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      await ensureLoaded();
      const mod = await import('@/components/portfolio/sonification/sonify');
      const fn = (mod as any)[key];
      if (typeof fn !== 'function') {
        console.error('Available exports:', mod);
        alert(`${key} is not available. Check sonify.ts exports.`);
        return;
      }
      await fn(args);
    } catch (e: any) {
      console.error(e);
      alert(`Failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hear It!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Play the mushroom’s electrical signals with different engines. Source:{' '}
          <code>{csvUrl}</code>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              runEngine('startPiano', {
                timeCompression: 3,
                smoothingWindow: 5,
                stepRateHz: 2.0,
                scaleMidiLow: 48,
                scaleMidiHigh: 84,
              })
            }
            className="px-3 py-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
            disabled={busy}
          >
            Piano
          </button>

          <button
            onClick={() =>
              runEngine('startAmbient', {
                timeCompression: 3,
                smoothingWindow: 7,
                stepRateHz: 3,
                velocity: 0.6,
              })
            }
            className="px-3 py-1.5 rounded-md bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
            disabled={busy}
          >
            Ambient
          </button>

          <button
            onClick={() =>
              runEngine('startChoir', {
                smoothingWindow: 5,
                stepRateHz: 2,
                timeCompression: 1,
              })
            }
            className="px-3 py-1.5 rounded-md bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
            disabled={busy}
          >
            Choir
          </button>

          <button
            onClick={async () => {
              try {
                const mod = await import('@/components/portfolio/sonification/sonify');
                if (typeof mod.stopAll === 'function') mod.stopAll();
              } catch (e) {
                console.error('Stop failed', e);
              }
            }}
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
