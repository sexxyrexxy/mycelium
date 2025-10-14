import { NextResponse } from "next/server";
import { authHeaders } from "@/lib/suno";

function requireBaseUrl() {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/,"");
  if (!base) throw new Error("NEXT_PUBLIC_BASE_URL is not set");
  return base;
}

// POST body: { audioId, model, continueAt, prompt, style, title, defaultParamFlag? }
// Model **must** match the original track's model (e.g., V4_5 if that created the base).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { audioId, model, continueAt, prompt, style, title, defaultParamFlag = true } = body || {};
    if (!audioId || !model || (typeof continueAt !== "number")) {
      return NextResponse.json({ error: "audioId, model, continueAt are required" }, { status: 400 });
    }
    const callBackUrl = `${requireBaseUrl()}/api/suno/callback`;

    const upstream = await fetch("https://api.sunoapi.org/api/v1/generate/extend", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultParamFlag,
        audioId,
        model,
        continueAt,
        prompt,
        style,
        title,
        styleWeight: 0.8,
        weirdnessConstraint: 0.35,
        audioWeight: 0.65,
        negativeTags: "no drums, no vocals, no harsh distortion",
        callBackUrl
      })
    });

    const raw = await upstream.text();
    let json: any = null; try { json = raw ? JSON.parse(raw) : null; } catch {}
    if (!upstream.ok || !json || json?.code !== 200) {
      return NextResponse.json({ error: json?.msg ?? `extend failed (${upstream.status})`, raw: raw?.slice(0,500) }, { status: 502 });
    }
    return NextResponse.json({ taskId: json.data.taskId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Internal error" }, { status: 500 });
  }
}
