// app/api/suno/resolve-audio/route.ts
import { NextResponse } from "next/server";
import { SUNO_BASE, authHeaders } from "@/lib/suno";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstRecordFromArray(value: unknown): JsonRecord | null {
  if (Array.isArray(value) && value.length > 0 && asRecord(value[0])) {
    return value[0];
  }
  return null;
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

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

  const parsed = (await res.json()) as unknown;
  const errorMessage =
    (asRecord(parsed) && typeof parsed.msg === "string" ? parsed.msg : null) ??
    "Suno status error";
  if (!res.ok) {
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  // Normalize several common shapes
  const candidates: JsonRecord[] = [];
  const rootRecord = asRecord(parsed) ? parsed : null;

  if (rootRecord) {
    const response = rootRecord.response;
    if (response) {
      const responseRecord = asRecord(response) ? response : null;
      if (responseRecord) {
        const sunoDataCandidate = firstRecordFromArray(responseRecord.sunoData);
        if (sunoDataCandidate) candidates.push(sunoDataCandidate);
        const responseDataCandidate = firstRecordFromArray(responseRecord.data);
        if (responseDataCandidate) candidates.push(responseDataCandidate);
        candidates.push(responseRecord);
      }
    }

    const dataCandidate = firstRecordFromArray(rootRecord.data);
    if (dataCandidate) candidates.push(dataCandidate);
  }

  const rootArrayCandidate = firstRecordFromArray(parsed);
  if (rootArrayCandidate) candidates.push(rootArrayCandidate);

  let picked: JsonRecord | null = null;
  for (const candidate of candidates) {
    const id =
      candidate.id ??
      candidate.audioId ??
      candidate.songId ??
      candidate.trackId ??
      candidate.clipId;
    if (id != null) {
      picked = candidate;
      break;
    }
  }

  if (!picked) {
    return NextResponse.json(
      { error: "No track found in status payload", raw: parsed },
      { status: 404 }
    );
  }

  const normalized = {
    id:
      coerceString(
        picked.id ??
          picked.audioId ??
          picked.songId ??
          picked.trackId ??
          picked.clipId
      ) ?? "",
    model:
      coerceString(
        picked.model ?? picked.modelName ?? picked.engine ?? picked.version
      ) ?? null,
    audioUrl:
      coerceString(
        picked.audioUrl ?? picked.audio_url ?? picked.mp3Url ?? picked.url
      ) ?? null,
    streamAudioUrl:
      coerceString(
        picked.streamAudioUrl ??
          picked.stream_url ??
          picked.streamUrl
      ) ?? null,
    title: coerceString(picked.title) ?? null,
    duration:
      typeof picked.duration === "number"
        ? picked.duration
        : coerceString(picked.duration),
    raw: parsed,
  };

  return NextResponse.json(normalized);
}
