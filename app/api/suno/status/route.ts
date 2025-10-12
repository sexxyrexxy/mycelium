// app/api/suno/status/route.ts
import { NextResponse } from "next/server";
import { authHeaders, SUNO_BASE } from "@/lib/suno";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

  const res = await fetch(`${SUNO_BASE}/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json?.code !== 200) {
    return NextResponse.json({ error: json?.msg ?? "Suno status error" }, { status: 500 });
  }

  // Example successful payload contains audioUrl / streamAudioUrl inside data.response.sunoData[]
  return NextResponse.json(json.data);
}
