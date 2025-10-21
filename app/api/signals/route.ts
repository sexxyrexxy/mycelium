// app/api/signals/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getBigQueryClient, googleConfig } from "@/lib/googleCloud";

type TimestampLike =
  | Date
  | string
  | number
  | null
  | undefined
  | { value?: string | number | null };

type SignalRow = {
  mushId: number;
  typeOfMush: string | null;
  name: string | null;
  timestamp: string;
  signal_mV: number | null;
};

type RawSignalRow = {
  mushId: number;
  typeOfMush: string | null;
  name: string | null;
  timestamp: TimestampLike;
  signal_mV: number | null;
};

const bq = getBigQueryClient();

function iso(ts: TimestampLike): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string") {
    const parsed = new Date(ts);
    return Number.isNaN(parsed.getTime()) ? ts : parsed.toISOString();
  }
  if (typeof ts === "number") {
    return new Date(ts).toISOString();
  }
  if (ts && typeof ts === "object" && "value" in ts && ts.value != null) {
    return iso(ts.value);
  }
  return String(ts ?? "");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mushId = Number(searchParams.get("mushId"));
    if (!mushId) {
      return NextResponse.json({ error: "mushId is required" }, { status: 400 });
    }
    const limit = Number(searchParams.get("limit") ?? 2000);
    const since = searchParams.get("since"); // optional ISO date filter

    const where = [`Msuh_ID = @mushId`];
    const params: Record<string, string | number> = { mushId };
    if (since) {
      where.push(`Timestamp >= @since`);
      params.since = since;
    }

    const query = `
      SELECT
        CAST(Msuh_ID AS INT64) AS mushId,
        Type_of_Mush           AS typeOfMush,
        Name                   AS name,
        Timestamp              AS timestamp,
        Signal_mV              AS signal_mV
      FROM \`${googleConfig.projectId}.${googleConfig.legacyDatasetId}.${googleConfig.legacyTableName}\`
      WHERE ${where.join(" AND ")}
      ORDER BY Timestamp ASC
      LIMIT @limit
    `;

    const [rows] = await bq.query<RawSignalRow>({
      query,
      params: { ...params, limit },
      location: googleConfig.uploadLocation,
    });

    const out: SignalRow[] = rows.map((row) => ({
      ...row,
      timestamp: iso(row.timestamp),
    }));

    return NextResponse.json(out);
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch signals" },
      { status: 500 }
    );
  }
}
