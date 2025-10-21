// app/api/suno/cover/route.ts
import { NextResponse } from "next/server";
import { authHeaders } from "@/lib/suno";
import { uploadFileToSuno } from "@/lib/sunoUpload";

// (B) call Upload-and-Cover
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Send multipart/form-data with a 'file' field" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const style = String(form.get("style") ?? "mysterious sci-fi ambient");
    const title = String(form.get("title") ?? "Ghost Fungi Sketch");
    const prompt = String(form.get("prompt") ?? "Transform this sketch…");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    const uploadUrl = await uploadFileToSuno(file);

    const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    if (!base) throw new Error("NEXT_PUBLIC_BASE_URL is not set");

    const res = await fetch("https://api.sunoapi.org/api/v1/generate/upload-cover", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadUrl,
        customMode: true,
        instrumental: true,
        model: "V4_5",
        style,
        title,
        prompt,
        styleWeight: 0.8,
        weirdnessConstraint: 0.35,
        audioWeight: 0.65,
        negativeTags: "no harsh drums, no vocals",
        callBackUrl: `${base}/api/suno/callback`,
      }),
    });

    const raw = await res.text();
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

    if (!res.ok || !json || json.code !== 200 || !json.data?.taskId) {
      return NextResponse.json({ error: json?.msg ?? `upload-cover failed (${res.status})`, raw: raw?.slice(0,500) }, { status: 502 });
    }
    return NextResponse.json({ taskId: json.data.taskId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
