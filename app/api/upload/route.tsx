import { NextRequest, NextResponse } from "next/server";
import { BigQuery, Job } from "@google-cloud/bigquery";
import os from "os";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = "mycelium-470904";
const DATASET_ID = "MushroomData1";
const TABLE_ID   = "Table1";
const LOCATION   = "US";
const KEY_FILE   = "mycelium-470904-5621723dfeff.json";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const tmpPath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
    await fs.writeFile(tmpPath, Buffer.from(await file.arrayBuffer()));

    const bq = new BigQuery({
      projectId: PROJECT_ID,
      keyFilename: KEY_FILE,
      location: LOCATION,
    });

    // Load file into BigQuery
    const [job] = await bq
      .dataset(DATASET_ID)
      .table(TABLE_ID)
      .load(tmpPath, {
        sourceFormat: "CSV",
        skipLeadingRows: 1,
        writeDisposition: "WRITE_APPEND",
        autodetect: false,
        schema: {
          fields: [
            { name: "Msuh_ID",       type: "INTEGER" },
            { name: "Type_of_Mush",  type: "STRING" },
            { name: "Name",          type: "STRING" },
            { name: "Timestamp",     type: "TIME" },   // or TIMESTAMP if date+time
            { name: "Signal_mV",     type: "FLOAT" },
          ],
        },
      }) as [Job]; // cast so TS knows this is a Job

    

    // Wait for completion if you want to block until finished(Not done yet)
    const jobId = job.id;
    await job.promise();
    const [meta] = await job.getMetadata();

    await fs.unlink(tmpPath);

    if (meta.status?.errorResult) {
      return NextResponse.json(
        { error: meta.status.errorResult.message, jobId },
        { status: 500 }
      );
    }

    const outputRows = (meta.statistics as any)?.load?.outputRows ?? null;

    return NextResponse.json({ jobId, status: "done", outputRows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Upload failed" }, { status: 500 });
  }
}
