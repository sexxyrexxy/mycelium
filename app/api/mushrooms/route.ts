// app/api/mushroom/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import os from "os";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- CONFIG ----
const PROJECT_ID = "mycelium-470904";
const DATASET_ID = "MushroomData";            // <- adjust if yours differs
const DETAILS_TABLE = "Mushroom_Details";      // columns: MushID STRING, UserID STRING, ImageUrl STRING, Name STRING, Mushroom_Kind STRING, Description STRING, CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
const SIGNALS_TABLE = "Mushroom_Signal";       // columns: MushID STRING, Timestamp TIMESTAMP, Signal_mV FLOAT64
const LOCATION = "australia-southeast1";
const KEY_FILE = "mycelium-470904-5621723dfeff.json";

const STAGING_SCHEMA = {
  fields: [
    { name: "Timestamp", type: "TIMESTAMP" },
    { name: "Signal_mV", type: "FLOAT" },
  ],
} as const;

export async function POST(req: NextRequest) {
  let tmpPath: string | null = null;
  let stagingId: string | null = null;

  try {
    // 1) Parse multipart form
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const name = (form.get("name") ?? "").toString().trim();
    const description = (form.get("description") ?? "").toString().trim();
    const kind = (form.get("kind") ?? "").toString().trim();
    const userId = (form.get("userId") ?? "").toString().trim();

    if (!userId || !name || !kind) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2) Save CSV temp file
    tmpPath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tmpPath, buf);

    // 3) BigQuery client
    const bq = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE, location: LOCATION });

    // 4) Insert details row and get mushId
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

    // 5) Create staging table
    stagingId = `stg_${mushId.replace(/-/g, "")}`;
    await bq.dataset(DATASET_ID).table(stagingId).delete({ ignoreNotFound: true }).catch(() => {});

    // 6) Load CSV into staging (await ensures load completes)
    await bq.dataset(DATASET_ID).table(stagingId).load(tmpPath, {
      schema: STAGING_SCHEMA as any,
      sourceFormat: "CSV",
      skipLeadingRows: 1,
      writeDisposition: "WRITE_TRUNCATE",
    });

    // 7) Insert staging rows into permanent signals table
    await bq.query({
      query: `
        INSERT INTO \`${PROJECT_ID}.${DATASET_ID}.${SIGNALS_TABLE}\` (MushID, Timestamp, Signal_mV)
        SELECT @mushId AS MushID, Timestamp, Signal_mV
        FROM \`${PROJECT_ID}.${DATASET_ID}.${stagingId}\`
      `,
      location: LOCATION,
      params: { mushId },
    });

    // 8) Count inserted rows
    const [countRows] = await bq.query({
      query: `SELECT COUNT(*) AS cnt FROM \`${PROJECT_ID}.${DATASET_ID}.${stagingId}\``,
      location: LOCATION,
    });
    const outputRows = Number((countRows?.[0] as any)?.cnt ?? 0);

    // 9) Cleanup
    await bq.dataset(DATASET_ID).table(stagingId).delete({ ignoreNotFound: true });
    stagingId = null;
    await fs.unlink(tmpPath);
    tmpPath = null;

    // 10) Response
    return NextResponse.json({ status: "ok", mushId, insertedSignals: outputRows });
  } catch (err: any) {
    // Best-effort cleanup
    try {
      if (stagingId) {
        const bq = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE, location: LOCATION });
        await bq.dataset(DATASET_ID).table(stagingId).delete({ ignoreNotFound: true });
      }
    } catch {}
    try {
      if (tmpPath) await fs.unlink(tmpPath);
    } catch {}

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
      SELECT 
        MushID, 
        Name, 
        Description, 
        Mushroom_Kind, 
        UserID
      FROM \`${PROJECT_ID}.${DATASET_ID}.${DETAILS_TABLE}\`
      
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