"use client";
import { useEffect, useState } from "react";
import { mapSignalToSuno } from "./sonification/sonify";

type SunoDataTrack = {
  id: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  title?: string;
  tags?: string;
  duration?: number;
};
type SunoStatusResponse = {
  status: string;
  response?: { sunoData?: SunoDataTrack[] };
};

export default function SunoGenerateButton({
  signal,
}: {
  signal: number[]; // pass your processed mushroom signal here
}) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  async function start() {
    setError(null);
    setStatus("starting");
    setStreamUrl(null);
    setFullUrl(null);

    const body = mapSignalToSuno(signal); // ← your mapping from sonify.ts

    const res = await fetch("/api/suno/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to start");
      setStatus("error");
      return;
    }
    setTaskId(json.taskId);
    setStatus("queued");
  }

  useEffect(() => {
    if (!taskId) return;
    let t: any;

    const poll = async () => {
      try {
        const res = await fetch(`/api/suno/status?taskId=${encodeURIComponent(taskId)}`, { cache: "no-store" });
        const data: SunoStatusResponse = await res.json();

        setStatus(data.status ?? "unknown");
        const first = data?.response?.sunoData?.[0];
        if (first?.streamAudioUrl && !streamUrl) setStreamUrl(first.streamAudioUrl);
        if (first?.audioUrl) setFullUrl(first.audioUrl);

        if ((data.status ?? "") !== "SUCCESS") {
          t = setTimeout(poll, 5000);
        }
      } catch (e: any) {
        setError(e.message);
        t = setTimeout(poll, 8000);
      }
    };

    poll();
    return () => clearTimeout(t);
  }, [taskId]);

  return (
    <div className="grid gap-2">
      <button onClick={start} className="rounded-xl px-4 py-2 bg-black text-white">
        Generate music from this signal
      </button>
      <small>Status: {status}</small>
      {error && <small className="text-red-600">Error: {error}</small>}
      {streamUrl && (
        <audio controls src={streamUrl}>
          Your browser does not support audio.
        </audio>
      )}
      {fullUrl && (
        <a className="underline" href={fullUrl} target="_blank" rel="noreferrer">
          Open full MP3
        </a>
      )}
    </div>
  );
}
