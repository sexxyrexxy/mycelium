import { NextResponse } from "next/server";
import { authHeaders } from "@/lib/suno";
import { uploadFileToSuno } from "@/lib/sunoUpload";

function requireBaseUrl() {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_BASE_URL is not set");
  return base;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Send multipart/form-data with a 'file' field." },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const title = String(
      form.get("title") ?? "Mushroom Synth Sonification",
    ).slice(0, 80);
    const style = String(
      form.get("style") ?? "ambient synth, organic textures",
    ).slice(0, 120);
    const prompt =
      String(
        form.get("prompt") ??
          "Enhance this synth-based sonification of mushroom electrical signals. Preserve the melodic contour while adding gentle ambient depth. No vocals, no harsh percussion.",
      ).slice(0, 500) || "";

    const uploadUrl = await uploadFileToSuno(file);
    const callBackUrl = `${requireBaseUrl()}/api/suno/callback`;

    const enhanceResponse = await fetch(
      "https://api.sunoapi.org/api/v1/generate/upload-cover",
      {
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
          styleWeight: 0.9,
          weirdnessConstraint: 0.15,
          audioWeight: 0.95,
          negativeTags: "vocals, harsh percussion, distorted drums",
          callBackUrl,
        }),
      },
    );

    const raw = await enhanceResponse.text();
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    type UploadCoverResponse = {
      code?: number;
      data?: { taskId?: string };
      msg?: string;
    };

    const payload = parsed as UploadCoverResponse | null;

    if (
      !enhanceResponse.ok ||
      !payload ||
      payload.code !== 200 ||
      !payload.data?.taskId
    ) {
      return NextResponse.json(
        {
          error:
            payload?.msg ??
            `upload-cover failed (${enhanceResponse.status})`,
          raw: raw?.slice(0, 500),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ taskId: payload.data.taskId });
  } catch (error) {
    console.error("[Suno upload-sonification] error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected internal error",
      },
      { status: 500 },
    );
  }
}
