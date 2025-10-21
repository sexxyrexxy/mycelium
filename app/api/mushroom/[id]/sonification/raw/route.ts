export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { saveSonificationBuffer } from "@/lib/sonificationStorage";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id?: string }> },
) {
  const { id } = await ctx.params;
  const mushId = id?.trim();
  if (!mushId) {
    return NextResponse.json({ error: "Missing mushroom id" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) {
      return NextResponse.json(
        { error: "Audio file is empty" },
        { status: 400 },
      );
    }

    const stored = await saveSonificationBuffer(mushId, "raw", buffer, {
      originalName: file.name,
      contentType: file.type,
    });

    return NextResponse.json({
      mushId,
      rawSound: stored,
    });
  } catch (error) {
    console.error("[Sonification raw upload]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to store raw sonification",
      },
      { status: 500 },
    );
  }
}

