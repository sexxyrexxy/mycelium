// app/api/realtime_upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import { PubSub } from "@google-cloud/pubsub"; 
import os from "os";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- CONFIG ----
const PROJECT_ID = "mycelium-470904";
const DATASET_ID = "MushroomData";
const DETAILS_TABLE = "TEST_Details";
const SIGNALS_TABLE = "TEST_Signal";
const LOCATION = "australia-southeast1";
const KEY_FILE = "mycelium-470904-5621723dfeff.json";
const PUBSUB_TOPIC = "bigquery-signal-stream"; 

// ---- HELPERS ----
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type CsvRow = { Timestamp: string; Signal_mV: number };

// 🧩 CSV parser stays the same
function parseCsv(content: string): CsvRow[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (!lines.length) return [];

  const header = lines[0].split(",").map((s) => s.trim());
  if (header.length < 2 || header[0] !== "Timestamp" || header[1] !== "Signal_mV") {
    throw new Error(`CSV header must be exactly: Timestamp,Signal_mV (got: "${lines[0]}")`);
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [tsRaw, valRaw] = lines[i].split(",");
    const ts = (tsRaw ?? "").trim();
    const val = Number((valRaw ?? "").trim());
    if (!ts || !Number.isFinite(val)) continue;
    rows.push({ Timestamp: ts, Signal_mV: val });
  }
  return rows;
}

export async function POST(req: NextRequest) {
  let tmpPath: string | null = null;

  try {
    // 1️⃣ Parse form
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const name = (form.get("name") ?? "").toString().trim();
    const description = (form.get("description") ?? "").toString().trim();
    const kind = (form.get("kind") ?? "").toString().trim();
    const userId = (form.get("userId") ?? "").toString().trim();

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (!userId || !name || !kind) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2️⃣ Save CSV temp
    tmpPath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tmpPath, buf);

    const csvContent = await fs.readFile(tmpPath, "utf8");
    const rows = parseCsv(csvContent);
    if (!rows.length) throw new Error("CSV has no data rows");

    // 3️⃣ Init BigQuery + Pub/Sub
    const bq = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE, location: LOCATION });
    const pubsub = new PubSub({ projectId: PROJECT_ID, keyFilename: KEY_FILE }); 
    const topic = pubsub.topic(PUBSUB_TOPIC);

    // 4️⃣ Insert details and get MushID
    const detailsScript = `
      DECLARE new_id STRING;
      SET new_id = GENERATE_UUID();

      INSERT INTO \`${PROJECT_ID}.${DATASET_ID}.${DETAILS_TABLE}\`
        (MushID, UserID, Name, Description, Mushroom_Kind)
      VALUES
        (new_id, @userId, @name, @description, @kind);

      SELECT new_id AS mushid;
    `;
    const [detailRows] = await bq.query({
      query: detailsScript,
      location: LOCATION,
      params: { userId, name, description, kind },
    });
    const mushId = (detailRows?.[0] as any)?.mushid as string | undefined;
    if (!mushId) throw new Error("Failed to obtain MushID");

    // 5️⃣ Insert & publish each row per second
    const table = bq.dataset(DATASET_ID).table(SIGNALS_TABLE);
    let inserted = 0;

    for (const r of rows) {
      // 5a. Insert into BigQuery
      await table.insert({
        MushID: mushId,
        Timestamp: r.Timestamp,
        Signal_mV: r.Signal_mV,
      });

      // 5b. Publish same row to Pub/Sub (so SSE gets it instantly)
      await topic.publishMessage({
        json: {
          MushID: mushId,
          Timestamp: r.Timestamp,
          Signal_mV: r.Signal_mV,
        },
      });

      inserted++;
      await sleep(1000); // 1 row/sec
    }

    // 6️⃣ Cleanup
    try { if (tmpPath) await fs.unlink(tmpPath); } catch {}
    tmpPath = null;

    // 7️⃣ Response
    return NextResponse.json({
      status: "ok",
      mode: "BigQuery + PubSub",
      interval_ms: 1000,
      mushId,
      insertedSignals: inserted,
      totalCsvRows: rows.length,
    });
  } catch (err: any) {
    try { if (tmpPath) await fs.unlink(tmpPath); } catch {}
    return NextResponse.json({ error: err?.message ?? "Upload failed" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    const bq = new BigQuery({
      projectId: PROJECT_ID,
      keyFilename: KEY_FILE,
      location: LOCATION,
    });

    const query = `
      SELECT MushID, Name, Description, Mushroom_Kind, UserID
      FROM \`${PROJECT_ID}.${DATASET_ID}.${DETAILS_TABLE}\`
      ORDER BY CreatedAt DESC
    `;
    const [rows] = await bq.query({ query, location: LOCATION });
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("GET mushrooms failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch mushrooms" },
      { status: 500 }
    );
  }
}
