// app/api/signals/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

type SignalRow = {
  mushId: number;
  typeOfMush: string | null;
  name: string | null;
  timestamp: string;      // ISO
  signal_mV: number | null;
};

const PROJECT_ID = "mycelium-470904";
const keyJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  : undefined;

const bq =
  (global as any)._bq ??
  new BigQuery(
    keyJson
      ? {
          projectId: keyJson.project_id || PROJECT_ID,
          credentials: {
            client_email: keyJson.client_email,
            private_key: keyJson.private_key,
          },
        }
      : { projectId: PROJECT_ID }
  );
(global as any)._bq = bq;

function iso(ts: any) {
  if (ts instanceof Date) return ts.toISOString();
  if (ts?.value) {
    const d = new Date(ts.value);
    return Number.isNaN(d.getTime()) ? String(ts.value) : d.toISOString();
  }
  if (typeof ts === "string") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? ts : d.toISOString();
  }
  return ts;
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
    const params: Record<string, any> = { mushId };
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
      FROM \`${PROJECT_ID}.MushroomData1.Table1\`
      WHERE ${where.join(" AND ")}
      ORDER BY Timestamp ASC
      LIMIT @limit
    `;

    const [rows] = await bq.query({
      query,
      params: { ...params, limit },
    });

    const out: SignalRow[] = rows.map((r: any) => ({
      ...r,
      timestamp: iso(r.timestamp),
    }));

    return NextResponse.json(out);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}
