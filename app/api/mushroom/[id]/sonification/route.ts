export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSonificationState } from "@/lib/sonificationStorage";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id?: string }> },
) {
  const { id } = await ctx.params;
  const mushId = id?.trim();
  if (!mushId) {
    return NextResponse.json({ error: "Missing mushroom id" }, { status: 400 });
  }

  try {
    const state = await getSonificationState(mushId);
    if (!state) {
      return NextResponse.json(
        { error: "Mushroom not found", mushId },
        { status: 404 },
      );
    }

    return NextResponse.json({
      mushId,
      rawSound: state.raw ?? null,
      sunoSound: state.suno ?? null,
    });
  } catch (error) {
    console.error("[Sonification GET]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load stored sonification",
      },
      { status: 500 },
    );
  }
}

