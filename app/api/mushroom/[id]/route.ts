// app/api/mushroom/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import fs from "fs";
import path from "path";

// ---- CONFIG ----
const BQ_PROJECT_ID = "mycelium-470904";
const DATASET_ID = "MushroomData";
const SIGNALS_TABLE = "Mushroom_Signal";
const LOCATION = "australia-southeast1";
const BQ_KEY_FILE = "mycelium-470904-5621723dfeff.json";

// ---- Init BigQuery ----
const bqKeyPath = path.join(process.cwd(), BQ_KEY_FILE);
const bqKey = JSON.parse(fs.readFileSync(bqKeyPath, "utf8"));
const bq = new BigQuery({
  projectId: BQ_PROJECT_ID,
  credentials: {
    client_email: bqKey.client_email,
    private_key: bqKey.private_key,
  },
});

// ---- Helpers ----
function tsString(ts: any): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string") return ts;
  if (ts?.value) return String(ts.value);
  return String(ts);
}

// ---- GET /api/mushroom/[id] ----
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const mushId = id; // UUID string

  try {
    // BigQuery signals
    const [rows] = await bq.query({
      query: `
        SELECT Timestamp, Signal_mV
        FROM \`${BQ_PROJECT_ID}.${DATASET_ID}.${SIGNALS_TABLE}\`
        WHERE MushID = @mushId
        ORDER BY Timestamp ASC
      `,
      params: { mushId },
      location: LOCATION,
    });

    const signals = rows.map((r: any) => ({
      timestamp: tsString(r.Timestamp),
      signal: r.Signal_mV ?? null,
    }));

    return NextResponse.json({ mushId, signals });
  } catch (e: any) {
    console.error("mushroom/[id] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch mushroom" },
      { status: 500 }
    );
  }
}