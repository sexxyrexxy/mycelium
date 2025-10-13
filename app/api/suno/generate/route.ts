// app/api/suno/generate/route.ts
import { NextResponse } from "next/server";
import { authHeaders, SUNO_BASE } from "@/lib/suno";

function requireBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_BASE_URL;
  if (!raw) throw new Error("NEXT_PUBLIC_BASE_URL is not set in .env.local");
  return raw.replace(/\/+$/, ""); // trim trailing slashes
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // REQUIRED by Suno: public callback URL (ngrok/vercel/etc.)
    const base = requireBaseUrl();
    const callBackUrl = `${base}/api/suno/callback`;

    const upstream = await fetch(`${SUNO_BASE}/generate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...body, callBackUrl }),
    });

    // Safe parse (handles empty/non-JSON responses)
    const raw = await upstream.text();
    let json: any = null;
    try { json = raw ? JSON.parse(raw) : null; } catch {}

    if (!upstream.ok || !json || json?.code !== 200) {
      console.error("[Suno generate] status:", upstream.status, "raw:", raw?.slice(0, 500));
      return NextResponse.json(
        { error: json?.msg ?? `Suno generate failed (${upstream.status})`, raw: raw?.slice(0, 500) },
        { status: 502 }
      );
    }

    // Success: { data: { taskId } }
    return NextResponse.json({ taskId: json.data.taskId });
  } catch (err: any) {
    console.error("[Suno generate] route error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
