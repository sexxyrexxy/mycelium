// app/api/suno/cover/route.ts
import { NextResponse } from "next/server";
import { authHeaders } from "@/lib/suno";

// (A) upload the file via Suno's File Upload API (stream)
async function uploadFileToSuno(file: File) {
  const form = new FormData();
  form.set("uploadPath", "user-uploads");           // any folder name
  form.set("fileName", file.name || "piano.wav");   // keep .wav
  form.set("file", file);

  const up = await fetch("https://sunoapiorg.redpandaai.co/api/file-stream-upload", {
    method: "POST",
    headers: { Authorization: authHeaders().Authorization }, // Bearer ...
    body: form,
  });
  const txt = await up.text();
  let json: any = null;
  try { json = txt ? JSON.parse(txt) : null; } catch {}
  if (!up.ok || !json?.data?.downloadUrl) {
    throw new Error(`Upload failed: ${json?.msg ?? up.status} ${txt?.slice(0,200)}`);
  }
  return json.data.downloadUrl as string; // temporary public URL
}

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
    let json: any = null; try { json = raw ? JSON.parse(raw) : null; } catch {}
    if (!res.ok || !json || json?.code !== 200) {
      return NextResponse.json({ error: json?.msg ?? `upload-cover failed (${res.status})`, raw: raw?.slice(0,500) }, { status: 502 });
    }
    return NextResponse.json({ taskId: json.data.taskId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Internal error" }, { status: 500 });
  }
}
