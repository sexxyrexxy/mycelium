// app/api/data/route.ts
import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({
  keyFilename: "mycelium-470904-5621723dfeff.json", // path to your service account
  projectId: "mycelium-470904",
});

export async function GET() {
  try {
    const query = `
      SELECT * 
      FROM \`mycelium-470904.MushroomData1.Table1\`
      ORDER BY Timestamp ASC
      LIMIT 10
    `;
    const [rows] = await bq.query({ query });

    const normalized = rows.map((r: any) => ({
  ...r,
  Timestamp:
    r?.Timestamp instanceof Date
      ? r.Timestamp.toISOString()               // or toLocaleString('en-AU')
      : (r?.Timestamp?.value ?? r?.Timestamp),  // handle { value: '...' }
}));

return NextResponse.json(normalized);

    return NextResponse.json(rows); // return JSON to frontend
  } catch (err) {
    console.error("BigQuery error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
