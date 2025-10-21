// import { NextRequest, NextResponse } from "next/server";
// import { BigQuery, Job } from "@google-cloud/bigquery";
// import os from "os";
// import path from "path";
// import fs from "fs/promises";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// const PROJECT_ID = "mycelium-470904";
// const DATASET_ID = "MushroomData1";
// const TABLE_ID   = "MushroomSignals";
// const LOCATION   = "US";
// const KEY_FILE   = "mycelium-470904-5621723dfeff.json";

// export async function POST(req: NextRequest) {
//   try {
//     const form = await req.formData();
//     const file = form.get("file") as File | null;
//     if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

//     const tmpPath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
//     await fs.writeFile(tmpPath, Buffer.from(await file.arrayBuffer()));

//     const bq = new BigQuery({
//       projectId: PROJECT_ID,
//       keyFilename: KEY_FILE,
//       location: LOCATION,
//     });

//     // Load file into BigQuery
//     const [loadJob] = await bq
//       .dataset(DATASET_ID)
//       .table(TABLE_ID)
//       .load(tmpPath, {
//         sourceFormat: "CSV",
//         skipLeadingRows: 1,
//         writeDisposition: "WRITE_APPEND",
//         autodetect: false,
//         schema: {
//           fields: [
//             { name: "Msuh_ID",       type: "INTEGER" },
//             { name: "Type_of_Mush",  type: "STRING" },
//             { name: "Name",          type: "STRING" },
//             { name: "Timestamp",     type: "TIME" },   // or TIMESTAMP if date+time
//             { name: "Signal_mV",     type: "FLOAT" },
//           ],
//         },
//       }); // cast so TS knows this is a Job

//      // 4) Rehydrate a Job handle (loadJob may be a plain object)
//     const jr = (loadJob as any)?.jobReference;
//     const cleanJobId =
//       jr?.jobId ??
//       // fallback: strip project:location prefix if only `id` is present
//       (typeof (loadJob as any)?.id === "string"
//         ? (loadJob as any).id.split(".").pop()
//         : undefined);

//     if (!cleanJobId) {
//       await fs.unlink(tmpPath);
//       return NextResponse.json({ error: "Could not determine jobId" }, { status: 500 });
//     }

//     // IMPORTANT: pass location separately, do NOT include it in the ID
//     const job = bq.job(cleanJobId, { location: jr?.location || LOCATION });

//     // wait for completion
//     const [meta] = await job.getMetadata();

//     await fs.unlink(tmpPath);

//     // Wait for completion if you want to block until finished(Not done yet)
//     // const jobId = job.id;
//     // await job.promise();
//     // const [meta] = await job.getMetadata();

//     // await fs.unlink(tmpPath);

//     if (meta.status?.errorResult) {
//       return NextResponse.json(
//         { error: meta.status.errorResult.message, jobId:cleanJobId },
//         { status: 500 }
//       );
//     }

//     const outputRows = (meta.statistics as any)?.load?.outputRows ?? null;

//     return NextResponse.json({ jobId:cleanJobId, status: "done", outputRows });
//   } catch (e: any) {
//     return NextResponse.json({ error: e.message ?? "Upload failed" }, { status: 500 });
//   }
// }

// app/api/mushroom/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { TableSchema } from "@google-cloud/bigquery";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { getBigQueryClient, googleConfig } from "@/lib/googleCloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSV expected columns (header row): Timestamp,Signal_mV
// If your CSV uses different names, update STAGING_SCHEMA and the INSERT SELECT below.

const STAGING_SCHEMA: TableSchema = {
  fields: [
    { name: "Timestamp", type: "TIMESTAMP" },
    { name: "Signal_mV", type: "FLOAT" }, // FLOAT == FLOAT64 in BigQuery API
  ],
} as const;

export async function POST(req: NextRequest) {
  let tmpPath: string | null = null;
  let stagingId: string | null = null;
  const bq = getBigQueryClient();
  const datasetPath = `${googleConfig.projectId}.${googleConfig.uploadDatasetId}`;

  try {
    // ---- 1) Read multipart form data ----
    const form = await req.formData();

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const name = (form.get("name") ?? "").toString().trim();
    const description = (form.get("description") ?? "").toString().trim();
    const kind = (form.get("kind") ?? "").toString().trim();

    // You should verify the user on the server. Here we accept a userId field for simplicity.
    // Recommended: send an ID token in Authorization header and verify with firebase-admin.
    const userId = (form.get("userId") ?? "").toString().trim();
    if (!userId || !name || !kind) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ---- 2) Persist the uploaded CSV to a temp file ----
    tmpPath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tmpPath, buf);

    // ---- 4) Insert details row and get mushId (UUID) ----
    const detailsScript = `
      DECLARE new_id STRING;
      SET new_id = GENERATE_UUID();

      INSERT INTO \`${datasetPath}.${googleConfig.detailsTable}\`
        (MushID, UserID, ImageUrl, Name, Mushroom_Kind, Description)
      VALUES
        (new_id, @userId, '', @name, @kind, @description);

      SELECT new_id AS mushid;
    `;

    const [detailRows] = await bq.query<{ mushid: string }>({
      query: detailsScript,
      location: googleConfig.uploadLocation,
      params: { userId, name, kind, description },
    });

    const mushId = detailRows?.[0]?.mushid;
    if (!mushId) {
      throw new Error("Failed to obtain MushID");
    }

    // ---- 5) Create a per-request staging table name (UUIDs have hyphens -> strip & prefix) ----
    stagingId = `stg_${mushId.replace(/-/g, "")}`;

    // Ensure no leftover table with the same name (very unlikely)
    try {
      await bq
        .dataset(googleConfig.uploadDatasetId)
        .table(stagingId)
        .delete({ ignoreNotFound: true });
    } catch {}

    // ---- 6) Load CSV into the staging table ----
    const [loadJob] = await bq
      .dataset(googleConfig.uploadDatasetId)
      .table(stagingId)
      .load(tmpPath, {
        schema: STAGING_SCHEMA,
        sourceFormat: "CSV",
        skipLeadingRows: 1,          // CSV has header row
        writeDisposition: "WRITE_TRUNCATE",
      });

    await loadJob.promise(); // wait for completion

    // Make sure the job completed without errors
    const [loadMeta] = await loadJob.getMetadata();
    if (loadMeta.status?.errorResult) {
      throw new Error(`Load error: ${loadMeta.status.errorResult.message}`);
    }

    // ---- 7) Fan rows into the main signals table with constant mushId ----
    // NOTE: Column names must match your SIGNALS table: MushID, Timestamp, Signal_mV
    const insertSignals = `
      INSERT INTO \`${googleConfig.projectId}.${googleConfig.uploadDatasetId}.${googleConfig.uploadSignalsTable}\` (MushID, Timestamp, Signal_mV)
      SELECT @mushId AS MushID, Timestamp, Signal_mV
      FROM \`${datasetPath}.${stagingId}\`
    `;
    const [insertJob] = await bq.createQueryJob({
      query: insertSignals,
      location: googleConfig.uploadLocation,
      params: { mushId },
    });
    await insertJob.getQueryResults(); // wait for completion

    // Optionally get row count inserted
    // (BigQuery doesn't directly return affected rows here; we can compute from staging)
    const [countRows] = await bq.query<{ cnt: string | number }>({
      query: `SELECT COUNT(*) AS cnt FROM \`${datasetPath}.${stagingId}\``,
      location: googleConfig.uploadLocation,
    });
    const outputRows = Number(countRows?.[0]?.cnt ?? 0);

    // ---- 8) Cleanup: drop staging table ----
    await bq
      .dataset(googleConfig.uploadDatasetId)
      .table(stagingId)
      .delete({ ignoreNotFound: true });
    stagingId = null;

    // ---- 9) Cleanup: delete temp file ----
    await fs.unlink(tmpPath);
    tmpPath = null;

    // ---- 10) Respond ----
    return NextResponse.json({
      status: "ok",
      mushId,
      insertedSignals: outputRows,
    });
  } catch (err: unknown) {
    // Best-effort cleanup
    try {
      if (stagingId) {
        await bq
          .dataset(googleConfig.uploadDatasetId)
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
