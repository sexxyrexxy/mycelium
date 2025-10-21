export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { saveSonificationFromUrl } from "@/lib/sonificationStorage";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id?: string }> },
) {
  const { id } = await ctx.params;
  const mushId = id?.trim();
  if (!mushId) {
    return NextResponse.json({ error: "Missing mushroom id" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const sourceUrl =
      typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    if (!sourceUrl) {
      return NextResponse.json(
        { error: "Missing sourceUrl" },
        { status: 400 },
      );
    }

    const fallbackName =
      typeof body.filename === "string" ? body.filename.trim() : undefined;

    const stored = await saveSonificationFromUrl(mushId, "suno", sourceUrl, {
      fallbackName,
    });

    return NextResponse.json({
      mushId,
      sunoSound: stored,
    });
  } catch (error) {
    console.error("[Sonification suno upload]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to store enhanced sonification",
      },
      { status: 500 },
    );
  }
}

