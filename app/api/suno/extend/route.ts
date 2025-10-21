import { NextResponse } from "next/server";
import { authHeaders } from "@/lib/suno";

function requireBaseUrl() {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/,"");
  if (!base) throw new Error("NEXT_PUBLIC_BASE_URL is not set");
  return base;
}

// POST body: { audioId, model, continueAt, prompt, style, title, defaultParamFlag? }
// Model **must** match the original track's model (e.g., V4_5 if that created the base).
type ExtendRequestBody = {
  audioId?: string;
  model?: string;
  continueAt?: number;
  prompt?: string;
  style?: string;
  title?: string;
  defaultParamFlag?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExtendRequestBody | null;
    const {
      audioId,
      model,
      continueAt,
      prompt,
      style,
      title,
      defaultParamFlag = true,
    } = body ?? {};
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
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    const json = parsed as {
      code?: number;
      data?: { taskId?: string };
      msg?: string;
    } | null;

    if (!upstream.ok || !json || json.code !== 200 || !json.data?.taskId) {
      return NextResponse.json({ error: json?.msg ?? `extend failed (${upstream.status})`, raw: raw?.slice(0,500) }, { status: 502 });
    }
    return NextResponse.json({ taskId: json.data.taskId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
