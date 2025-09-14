// app/api/mushroom/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import { Firestore } from "@google-cloud/firestore";
import fs from "fs";
import path from "path";

// --- Firestore (mycelium-29d2c) ---
const fsKeyPath = path.join(
  process.cwd(),
  "mycelium-29d2c-firebase-adminsdk-fbsvc-237030bd4f.json"
);
const fsKey = JSON.parse(fs.readFileSync(fsKeyPath, "utf8"));
const firestore = new Firestore({
  projectId: fsKey.project_id,
  credentials: { client_email: fsKey.client_email, private_key: fsKey.private_key },
});

// --- BigQuery (mycelium-470904) ---
const bqKeyPath = path.join(process.cwd(), "mycelium-470904-5621723dfeff.json");
const bqKey = JSON.parse(fs.readFileSync(bqKeyPath, "utf8"));
const bq = new BigQuery({
  projectId: bqKey.project_id,
  credentials: { client_email: bqKey.client_email, private_key: bqKey.private_key },
});

function tsString(ts: any): string {
  if (ts?.toDate) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (ts?.value) return String(ts.value);
  return String(ts);
}

// NOTE: params is now async; await it before use
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const mushId = Number(id);
  if (!Number.isFinite(mushId)) {
    return NextResponse.json({ error: "Invalid mushId" }, { status: 400 });
  }

  try {
    // Firestore metadata
    const snap = await firestore
      .collection("mushrooms")
      .where("mushId", "==", mushId)
      .limit(1)
      .get();

    const doc = snap.docs[0];
    const meta = doc ? { id: doc.id, ...doc.data() } : null;

    // BigQuery signals
    const [rows] = await bq.query({
      query: `
        SELECT Timestamp, Signal_mV
        FROM \`mycelium-470904.MushroomData1.Table1\`
        WHERE Mush_ID = @mushId
        ORDER BY Timestamp ASC
        LIMIT 500
      `,
      params: { mushId },
    });

    const signals = rows.map((r: any) => ({
      timestamp: tsString(r.Timestamp),
      signal: r.Signal_mV ?? null,
    }));

    if (meta) {
      const out: any = { ...meta, signals };
      if (out.spawnDate) out.spawnDate = tsString(out.spawnDate);
      return NextResponse.json(out);
    }
    return NextResponse.json({ mushId, signals });
  } catch (e: any) {
    console.error("mushroom/[id] error:", e);
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
