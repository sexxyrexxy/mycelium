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
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const mushId = id;

  const url = new URL(req.url);
  const rangeParam = (url.searchParams.get("range") || "all").toLowerCase();
  const limitParam = url.searchParams.get("limit");

const rangeMap: Record<string, { label: string; hours: number }> = {
  "4h": { label: "4h", hours: 4 },
  "4hours": { label: "4h", hours: 4 },
  "12h": { label: "12h", hours: 12 },
  "12hours": { label: "12h", hours: 12 },
  "1d": { label: "1d", hours: 24 },
  "24h": { label: "1d", hours: 24 },
  "day": { label: "1d", hours: 24 },
  "3d": { label: "3d", hours: 24 * 3 },
  "72h": { label: "3d", hours: 24 * 3 },
  "1w": { label: "1w", hours: 24 * 7 },
  "7d": { label: "1w", hours: 24 * 7 },
  "week": { label: "1w", hours: 24 * 7 },
  "all": { label: "all", hours: 0 },
  "alltime": { label: "all", hours: 0 },
  "max": { label: "all", hours: 0 },
};

  const selected = rangeMap[rangeParam] || rangeMap["all"];
  const rangeKey = selected.label;
  const hoursWindow = selected.hours;

  let limit: number | null = null;
  if (limitParam) {
    const parsed = Number(limitParam);
    if (Number.isFinite(parsed)) {
      limit = Math.max(1, Math.min(100_000, Math.floor(parsed)));
    }
  }

  try {
    const limitClause = limit ? "\n    LIMIT @rowLimit" : "";

    const query = `
      WITH base AS (
        SELECT
          Timestamp,
          Signal_mV,
          MAX(Timestamp) OVER() AS latest_ts
        FROM \`${BQ_PROJECT_ID}.${DATASET_ID}.${SIGNALS_TABLE}\`
        WHERE MushID = @mushId
      )
      SELECT Timestamp, Signal_mV
      FROM base
      WHERE (
          @range = 'all'
          OR (
            latest_ts IS NOT NULL
            AND Timestamp >= TIMESTAMP_SUB(latest_ts, INTERVAL CAST(@hours AS INT64) HOUR)
          )
        )
      ORDER BY Timestamp ASC${limitClause};
    `;

    const params: Record<string, unknown> = {
      mushId,
      range: rangeKey,
      hours: hoursWindow,
    };

    if (limit) {
      params.rowLimit = limit;
    }

    const [rows] = await bq.query({
      query,
      params,
      location: LOCATION,
    });

    const signals = rows.map((r: any) => ({
      timestamp: tsString(r.Timestamp),
      signal: r.Signal_mV ?? null,
    }));

    return NextResponse.json({
      mushId,
      signals,
      meta: {
        range: rangeKey,
        count: signals.length,
        limited: Boolean(limit),
        hours: hoursWindow,
      },
    });
  } catch (e: any) {
    console.error("mushroom/[id] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch mushroom" },
      { status: 500 }
    );
  }
}
