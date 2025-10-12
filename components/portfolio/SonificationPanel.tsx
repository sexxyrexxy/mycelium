// components/portfolio/sonification/SonificationPanel.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Props = { csvUrl?: string };

type SunoTrack = {
  id: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  title?: string;
  tags?: string;
  duration?: number;
};

type SunoStatusResponse = {
  status: string; // PENDING | TEXT_SUCCESS | FIRST_SUCCESS | SUCCESS | FAIL | ...
  response?: { sunoData?: SunoTrack[] };
};

export function SonificationPanel({ csvUrl = "/GhostFungi.csv" }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const taskIdRef = useRef<string | null>(null);

  // --- lightweight CSV → number[] parser (first numeric token per row) ---
  const loadSignal = useCallback(async () => {
    const resp = await fetch(csvUrl, { cache: "no-store" });
    if (!resp.ok) throw new Error(`Failed to load CSV: ${csvUrl}`);
    const text = await resp.text();

    const lines = text.split(/\r?\n/);
    const nums: number[] = [];
    for (const line of lines) {
      // pick the first parseable number in the row
      const match = line.match(/-?\d+(\.\d+)?/g);
      if (!match) continue;
      const val = parseFloat(match[0]);
      if (!Number.isNaN(val)) nums.push(val);
    }
    if (nums.length === 0) throw new Error("CSV contained no numeric values.");
    // downsample a bit so prompts reflect recent window
    const window = nums.slice(-Math.min(nums.length, 1500)); // up to last ~1500 samples
    return window;
  }, [csvUrl]);

  // --- start generation flow on click ---
  const onHear = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setStatus("preparing");
    setStreamUrl(null);
    setFullUrl(null);
    taskIdRef.current = null;

    try {
      // 1) get a representative signal window
      const signal = await loadSignal();

      // 2) map signal → Suno request body (from your sonify.ts)
      const mod = await import("@/components/portfolio/sonification/sonify");
      if (typeof mod.mapSignalToSuno !== 'function') {
        console.error('sonify exports:', Object.keys(mod));
        throw new Error('mapSignalToSuno is not exported from sonify.ts');
      }
      const body = mod.mapSignalToSuno(signal);

      // 3) POST /api/suno/generate
      const genRes = await fetch("/api/suno/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const genJson = await genRes.json();
      if (!genRes.ok || !genJson?.taskId) {
        throw new Error(genJson?.error ?? "Failed to start Suno generation");
      }
      taskIdRef.current = genJson.taskId;
      setStatus("queued");

      // 4) poll /api/suno/status until SUCCESS
      let keepPolling = true;
      while (keepPolling) {
        const tid = taskIdRef.current!;
        const res = await fetch(`/api/suno/status?taskId=${encodeURIComponent(tid)}`, {
          cache: "no-store",
        });
        const data: SunoStatusResponse = await res.json();

        if (!res.ok) {
          throw new Error((data as any)?.error ?? "Status request failed");
        }

        setStatus(data.status ?? "unknown");

        const track = data?.response?.sunoData?.[0];
        if (track?.streamAudioUrl && !streamUrl) setStreamUrl(track.streamAudioUrl);
        if (track?.audioUrl) setFullUrl(track.audioUrl);

        if (data.status === "SUCCESS" || data.status === "FAIL") {
          keepPolling = false;
        } else {
          // Poll every 5s while in progress
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }, [busy, loadSignal, streamUrl]);

  // stop polling if unmounted
  useEffect(() => {
    return () => {
      taskIdRef.current = null;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hear your Mushroom</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Generates music from your mushroom’s electrical signals via Suno. Source:{" "}
          <code className="text-xs">{csvUrl}</code>
        </p>

        <button
          onClick={onHear}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Working…" : "Hear your Mushroom"}
        </button>

        <div className="text-sm">
          <div>Status: {status}</div>
          {error && <div className="text-rose-600">Error: {error}</div>}
        </div>

        {streamUrl && (
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Streaming preview:</div>
            <audio controls src={streamUrl}>
              Your browser does not support audio.
            </audio>
          </div>
        )}

        {fullUrl && (
          <div className="text-sm">
            <a className="underline" href={fullUrl} target="_blank" rel="noreferrer">
              Open full MP3
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
