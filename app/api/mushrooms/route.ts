// app/api/mushrooms/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Firestore, QueryDocumentSnapshot } from "@google-cloud/firestore";
import { readFileSync } from "fs";
import path from "path";

type MushroomMeta = {
  mushId: number;
  name: string;
  kind?: string;
  bio?: string;
  imageUrl?: string;
  spawnDate?: any; // Firestore Timestamp
  [k: string]: any;
};

// --- Firestore (Firebase project) ---
const FIREBASE_PROJECT_ID = "mycelium-29d2c";

// Prefer ENV in prod; for local dev read the file you added to the repo (but DON'T commit it!)
const KEYFILE_PATH = path.join(
  process.cwd(),
  "mycelium-29d2c-firebase-adminsdk-fbsvc-237030bd4f.json"
);

const svcKey =
  process.env.FIRESTORE_CREDENTIALS_JSON
    ? JSON.parse(process.env.FIRESTORE_CREDENTIALS_JSON)
    : JSON.parse(readFileSync(KEYFILE_PATH, "utf8"));

const firestore =
  (global as any)._fs ??
  new Firestore({
    projectId: svcKey.project_id || FIREBASE_PROJECT_ID,
    credentials: {
      client_email: svcKey.client_email,
      private_key: svcKey.private_key,
    },
  });
(global as any)._fs = firestore;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mushIdParam = searchParams.get("mushId");
    const col = firestore.collection("mushrooms");

    const snap =
      mushIdParam != null
        ? await col.where("mushId", "==", Number(mushIdParam)).get()
        : await col.get();

    const items: MushroomMeta[] = [];
    snap.forEach((doc: QueryDocumentSnapshot) => {
      const d = doc.data() as MushroomMeta;
      const out: any = { id: doc.id, ...d };
      if (out.spawnDate?.toDate) out.spawnDate = out.spawnDate.toDate().toISOString();
      items.push(out);
    });

    if (mushIdParam != null) {
      return NextResponse.json(items[0] ?? null);
    }
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch mushrooms" },
      { status: 500 }
    );
  }
}
