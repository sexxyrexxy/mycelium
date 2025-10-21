// app/api/mushroom/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { TableSchema } from "@google-cloud/bigquery";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { getBigQueryClient, googleConfig } from "@/lib/googleCloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAGING_SCHEMA: TableSchema = {
  fields: [
    { name: "Timestamp", type: "TIMESTAMP" },
    { name: "Signal_mV", type: "FLOAT" },
  ],
} as const;

export async function POST(req: NextRequest) {
  let tmpPath: string | null = null;
  let stagingId: string | null = null;
  const bq = getBigQueryClient();
  const datasetPath = `${googleConfig.projectId}.${googleConfig.datasetId}`;

  try {
    // 1) Parse multipart form
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

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

    // 3) Insert details row and get mushId
    const detailsScript = `
      DECLARE new_id STRING;
      SET new_id = GENERATE_UUID();

      INSERT INTO \`${datasetPath}.${googleConfig.detailsTable}\`
        (MushID, UserID, Name, Description, Mushroom_Kind)
      VALUES
        (new_id, @userId, @name, @description, @kind);

      SELECT new_id AS mushid;
    `;

    const [detailRows] = await bq.query<{ mushid: string }>({
      query: detailsScript,
      location: googleConfig.location,
      params: { userId, name, description, kind },
    });

    const mushId = detailRows?.[0]?.mushid;
    if (!mushId) throw new Error("Failed to obtain MushID");

    // 5) Create staging table
    stagingId = `stg_${mushId.replace(/-/g, "")}`;
    await bq
      .dataset(googleConfig.datasetId)
      .table(stagingId)
      .delete({ ignoreNotFound: true })
      .catch(() => {});

    // 6) Load CSV into staging (await ensures load completes)
    await bq.dataset(googleConfig.datasetId).table(stagingId).load(tmpPath, {
      schema: STAGING_SCHEMA,
      sourceFormat: "CSV",
      skipLeadingRows: 1,
      writeDisposition: "WRITE_TRUNCATE",
    });

    // 7) Insert staging rows into permanent signals table
    await bq.query({
      query: `
        INSERT INTO \`${datasetPath}.${googleConfig.signalsTable}\` (MushID, Timestamp, Signal_mV)
        SELECT @mushId AS MushID, Timestamp, Signal_mV
        FROM \`${datasetPath}.${stagingId}\`
      `,
      location: googleConfig.location,
      params: { mushId },
    });

    // 8) Count inserted rows
    const [countRows] = await bq.query<{ cnt: string | number }>({
      query: `SELECT COUNT(*) AS cnt FROM \`${datasetPath}.${stagingId}\``,
      location: googleConfig.location,
    });
    const outputRows = Number(countRows?.[0]?.cnt ?? 0);

    // 9) Cleanup
    await bq
      .dataset(googleConfig.datasetId)
      .table(stagingId)
      .delete({ ignoreNotFound: true });
    stagingId = null;
    await fs.unlink(tmpPath);
    tmpPath = null;

    // 10) Response
    return NextResponse.json({ status: "ok", mushId, insertedSignals: outputRows });
  } catch (err: unknown) {
    // Best-effort cleanup
    try {
      if (stagingId) {
        await bq
          .dataset(googleConfig.datasetId)
          .table(stagingId)
          .delete({ ignoreNotFound: true });
      }
    } catch {}
    try {
      if (tmpPath) await fs.unlink(tmpPath);
    } catch {}

    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const query = `
      SELECT 
        MushID, 
        Name, 
        Description, 
        Mushroom_Kind, 
        UserID
      FROM \`${googleConfig.projectId}.${googleConfig.datasetId}.${googleConfig.detailsTable}\`
      
    `;

    const [rows] = await getBigQueryClient().query<Record<string, unknown>>({
      query,
      location: googleConfig.location,
    });
    return NextResponse.json(rows);
  } catch (err: unknown) {
    console.error("GET mushrooms failed:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch mushrooms";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
