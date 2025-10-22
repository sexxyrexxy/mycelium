// app/api/mushroom/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getBigQueryClient, googleConfig } from "@/lib/googleCloud";

const bq = getBigQueryClient();

// ---- Helpers ----
type TimestampLike =
  | Date
  | string
  | number
  | null
  | undefined
  | { value?: string | number | null };

interface SignalRow {
  Timestamp: TimestampLike;
  Signal_mV: number | null;
}

function tsString(ts: TimestampLike): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string") return ts;
  if (typeof ts === "number") return new Date(ts).toISOString();
  if (ts && typeof ts === "object" && "value" in ts && ts.value != null) {
    return String(ts.value);
  }
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
        FROM \`${googleConfig.projectId}.${googleConfig.datasetId}.${googleConfig.signalsTable}\`
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

    const [rows] = await bq.query<SignalRow>({
      query,
      params,
      location: googleConfig.location,
    });

    const signals = rows.map((row) => ({
      timestamp: tsString(row.Timestamp),
      signal: row.Signal_mV ?? null,
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
  } catch (e: unknown) {
    console.error("mushroom/[id] error:", e);
    const message = e instanceof Error ? e.message : "Failed to fetch mushroom";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// ---- DELETE /api/mushroom/[id] ----
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const mushId = id;

  try {
    const datasetPath = `${googleConfig.projectId}.${googleConfig.datasetId}`;

    // Delete related signals first, then details row
    const deleteSignals = `
      DELETE FROM ` + "`" + `${datasetPath}.${googleConfig.signalsTable}` + "`" + `
      WHERE MushID = @mushId;
    `;

    const deleteDetails = `
      DELETE FROM ` + "`" + `${datasetPath}.${googleConfig.detailsTable}` + "`" + `
      WHERE MushID = @mushId;
    `;

    await bq.query({
      query: deleteSignals,
      params: { mushId },
      location: googleConfig.location,
    });

    await bq.query({
      query: deleteDetails,
      params: { mushId },
      location: googleConfig.location,
    });

    return NextResponse.json({ status: "ok", mushId });
  } catch (e: unknown) {
    console.error("DELETE mushroom/[id] error:", e);
    const message = e instanceof Error ? e.message : "Failed to delete mushroom";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}