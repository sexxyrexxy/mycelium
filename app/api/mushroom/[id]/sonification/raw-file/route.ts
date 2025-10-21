export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { downloadSonificationBuffer } from "@/lib/sonificationStorage";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id?: string }> },
) {
  const { id } = await ctx.params;
  const mushId = id?.trim();
  if (!mushId) {
    return new Response(JSON.stringify({ error: "Missing mushroom id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { buffer, contentType } = await downloadSonificationBuffer(mushId, "raw");
    const uint8 = new Uint8Array(buffer.length);
    uint8.set(buffer);
    return new Response(uint8, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Sonification raw-file]", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unable to load stored synth audio",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
