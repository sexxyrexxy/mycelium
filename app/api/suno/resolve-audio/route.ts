// app/api/suno/resolve-audio/route.ts
import { NextResponse } from "next/server";
import { SUNO_BASE, authHeaders } from "@/lib/suno";

/**
 * Resolve a usable {id, model, audioUrl, streamAudioUrl} for a given taskId.
 * This wraps Suno's status/get-like responses and normalizes common shapes.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  // Hit Suno status (or use the equivalent "get-by-task" if your API has it)
  const res = await fetch(`${SUNO_BASE}/status?taskId=${encodeURIComponent(taskId)}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: json?.msg ?? "Suno status error" }, { status: 500 });
  }

  // Normalize several common shapes
  const candidates: any[] = [];
  const pushIf = (v: any) => { if (v) candidates.push(v); };

  pushIf(json?.response?.sunoData?.[0]);
  pushIf(json?.response?.data?.[0]);
  pushIf(json?.data?.[0]);
  if (json?.response && typeof json.response === "object" && !Array.isArray(json.response)) {
    pushIf(json.response);
  }
  if (Array.isArray(json)) pushIf(json[0]);

  let picked: any | null = null;
  for (const raw of candidates) {
    if (!raw) continue;
    const id = raw.id ?? raw.audioId ?? raw.songId ?? raw.trackId ?? raw.clipId;
    if (id) { picked = raw; break; }
  }

  if (!picked) {
    return NextResponse.json({ error: "No track found in status payload", raw: json }, { status: 404 });
  }

  const normalized = {
    id: String(picked.id ?? picked.audioId ?? picked.songId ?? picked.trackId ?? picked.clipId),
    model: picked.model ?? picked.modelName ?? picked.engine ?? picked.version ?? null,
    audioUrl: picked.audioUrl ?? picked.audio_url ?? picked.mp3Url ?? picked.url ?? null,
    streamAudioUrl: picked.streamAudioUrl ?? picked.stream_url ?? picked.streamUrl ?? null,
    title: picked.title ?? null,
    duration: picked.duration ?? null,
    raw: json,
  };

  return NextResponse.json(normalized);
}
