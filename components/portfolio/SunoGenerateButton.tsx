"use client";
import { useEffect, useState } from "react";
import type { SignalWindowsAnalysis } from "@/lib/signalClassification";
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
  status?: string;
  response?: { sunoData?: SunoDataTrack[] };
  error?: string;
};

type SunoGenerateResponse = {
  taskId?: string;
  error?: string;
};

type SunoStatus = "idle" | "starting" | "queued" | "error" | "SUCCESS" | "unknown";

export default function SunoGenerateButton({ analysis }: { analysis: SignalWindowsAnalysis | null }) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<SunoStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  async function start() {
    setError(null);
    if (!analysis || !analysis.windows.length) {
      setStatus("error");
      setError("No classified signal windows available.");
      return;
    }
    setStatus("starting");
    setStreamUrl(null);
    setFullUrl(null);

    const body = mapSignalToSuno(analysis);

    const res = await fetch("/api/suno/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const parsed = (await res.json()) as SunoGenerateResponse | null;
    if (!res.ok || !parsed?.taskId) {
      setError(parsed?.error ?? "Failed to start");
      setStatus("error");
      return;
    }
    setTaskId(parsed.taskId);
    setStatus("queued");
  }

  useEffect(() => {
    if (!taskId) return;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`/api/suno/status?taskId=${encodeURIComponent(taskId)}`, { cache: "no-store" });
        const data = (await res.json()) as SunoStatusResponse;

        setStatus((data.status as SunoStatus) ?? "unknown");
        const first = data?.response?.sunoData?.[0];
        if (first?.streamAudioUrl) {
          setStreamUrl((prev) => prev ?? first.streamAudioUrl ?? null);
        }
        if (first?.audioUrl) {
          setFullUrl((prev) => prev ?? first.audioUrl ?? null);
        }

        if ((data.status ?? "") !== "SUCCESS") {
          timeoutHandle = setTimeout(poll, 5000);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to poll status.";
        setError(message);
        timeoutHandle = setTimeout(poll, 8000);
      }
    };

    poll();
    return () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [taskId]);

  return (
    <div className="grid gap-2">
      <button
        onClick={start}
        disabled={!analysis || !analysis.windows.length || status === "starting"}
        className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50"
      >
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
