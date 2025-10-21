// lib/sonificationStorage.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { BigQuery } from "@google-cloud/bigquery";
import { Storage } from "@google-cloud/storage";

const PROJECT_ID =
  process.env.GCP_PROJECT_ID ||
  process.env.BQ_PROJECT_ID ||
  "mycelium-470904";
const DATASET_ID = process.env.BQ_DATASET_ID || "MushroomData";
const DETAILS_TABLE = process.env.BQ_DETAILS_TABLE || "Mushroom_Details";
const LOCATION = process.env.BQ_LOCATION || "australia-southeast1";
const KEY_FILE = process.env.GCP_KEY_FILE || "mycelium-470904-5621723dfeff.json";
const BUCKET_NAME =
  process.env.GCS_SONIFICATION_BUCKET ||
  process.env.GCS_SOUNDS_BUCKET ||
  "mycelium_sound";

type SonificationKind = "raw" | "suno";

export type SonificationStoredValue = {
  originalPath: string;
  objectName: string;
  signedUrl: string | null;
};

export type SonificationState = {
  mushId: string;
  raw?: SonificationStoredValue | null;
  suno?: SonificationStoredValue | null;
};

let cachedCredentials:
  | { client_email: string; private_key: string }
  | null = null;

function loadCredentials() {
  if (cachedCredentials) return cachedCredentials;
  const keyPath = path.join(process.cwd(), KEY_FILE);
  const content = fs.readFileSync(keyPath, "utf8");
  const json = JSON.parse(content);
  const credentials = {
    client_email: json.client_email,
    private_key: json.private_key,
  };
  cachedCredentials = credentials;
  return credentials;
}

const credentials = loadCredentials();

const bigQuery = new BigQuery({
  projectId: PROJECT_ID,
  credentials,
});

const storage = new Storage({
  projectId: PROJECT_ID,
  credentials,
});

const bucket = storage.bucket(BUCKET_NAME);

function normaliseObjectPath(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("gs://")) {
    const remainder = trimmed.slice(5);
    const slashIndex = remainder.indexOf("/");
    if (slashIndex === -1) return null;
    const bucketName = remainder.slice(0, slashIndex);
    const objectName = remainder.slice(slashIndex + 1);
    return bucketName === BUCKET_NAME ? objectName : objectName || null;
  }

  const httpsPrefix = "https://storage.googleapis.com/";
  if (trimmed.startsWith(httpsPrefix)) {
    const remainder = trimmed.slice(httpsPrefix.length);
    if (remainder.startsWith(`${BUCKET_NAME}/`)) {
      return remainder.slice(BUCKET_NAME.length + 1) || null;
    }
    const slashIndex = remainder.indexOf("/");
    return slashIndex >= 0 ? remainder.slice(slashIndex + 1) || null : null;
  }

  return trimmed.replace(/^\/+/, "") || null;
}

function guessExtension(
  originalName: string | undefined,
  contentType: string | undefined,
): string {
  const lowerName = originalName?.toLowerCase() ?? "";
  const extFromName =
    lowerName.includes(".") && lowerName.lastIndexOf(".") < lowerName.length - 1
      ? lowerName.slice(lowerName.lastIndexOf("."))
      : "";

  if (extFromName) return extFromName;

  switch (contentType) {
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/wav":
      return ".wav";
    case "audio/flac":
      return ".flac";
    default:
      return ".mp3";
  }
}

function buildObjectName(
  mushId: string,
  kind: SonificationKind,
  originalName?: string,
  contentType?: string,
): string {
  const safeId = mushId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const ext = guessExtension(originalName, contentType);
  const hash = crypto.randomUUID();
  return `${safeId}/${kind}/${Date.now()}-${hash}${ext}`;
}

async function signedUrlForObject(objectName: string): Promise<string | null> {
  try {
    const [url] = await bucket.file(objectName).getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    return url;
  } catch {
    return null;
  }
}

async function fetchCurrentPaths(
  mushId: string,
): Promise<{ raw?: string | null; suno?: string | null } | null> {
  const [rows] = await bigQuery.query({
    query: `
      SELECT raw_sound, suno_sound
      FROM \`${PROJECT_ID}.${DATASET_ID}.${DETAILS_TABLE}\`
      WHERE MushID = @mushId
      LIMIT 1
    `,
    params: { mushId },
    location: LOCATION,
  });

  if (!rows?.length) {
    return null;
  }

  const row = rows[0] as Record<string, unknown>;
  return {
    raw: row.raw_sound ? String(row.raw_sound) : null,
    suno: row.suno_sound ? String(row.suno_sound) : null,
  };
}

async function deleteIfExists(objectName: string | null): Promise<void> {
  if (!objectName) return;
  try {
    await bucket.file(objectName).delete({ ignoreNotFound: true });
  } catch {
    // Ignored – best effort cleanup.
  }
}

async function writeBufferToGcs(
  objectName: string,
  buffer: Buffer,
  contentType?: string,
): Promise<void> {
  await bucket.file(objectName).save(buffer, {
    resumable: false,
    contentType: contentType || "audio/mpeg",
    metadata: { cacheControl: "public,max-age=3600" },
  });
}

async function updateBigQueryColumn(
  mushId: string,
  column: "raw_sound" | "suno_sound",
  objectName: string,
): Promise<void> {
  await bigQuery.query({
    query: `
      UPDATE \`${PROJECT_ID}.${DATASET_ID}.${DETAILS_TABLE}\`
      SET ${column} = @objectName
      WHERE MushID = @mushId
    `,
    params: { mushId, objectName },
    location: LOCATION,
  });
}

export async function getSonificationState(
  mushId: string,
): Promise<SonificationState | null> {
  const current = await fetchCurrentPaths(mushId);
  if (!current) return null;

  const buildValue = async (value: string | null) => {
    if (!value) return null;
    const objectName = normaliseObjectPath(value);
    if (!objectName) return null;
    const signedUrl = await signedUrlForObject(objectName);
    return {
      originalPath: value,
      objectName,
      signedUrl,
    };
  };

  return {
    mushId,
    raw: await buildValue(current.raw ?? null),
    suno: await buildValue(current.suno ?? null),
  };
}

export async function saveSonificationBuffer(
  mushId: string,
  kind: SonificationKind,
  buffer: Buffer,
  options: { originalName?: string; contentType?: string } = {},
): Promise<SonificationStoredValue> {
  if (!buffer.length) {
    throw new Error("Cannot store an empty audio buffer.");
  }

  const current = await fetchCurrentPaths(mushId);
  if (!current) {
    throw new Error(`Unknown mushroom id: ${mushId}`);
  }

  const column = kind === "raw" ? "raw_sound" : "suno_sound";
  const previousValue = column === "raw_sound" ? current.raw : current.suno;
  const previousObject = normaliseObjectPath(previousValue ?? null);

  const objectName = buildObjectName(
    mushId,
    kind,
    options.originalName,
    options.contentType,
  );

  await writeBufferToGcs(objectName, buffer, options.contentType);
  await updateBigQueryColumn(mushId, column, objectName);

  if (previousObject && previousObject !== objectName) {
    await deleteIfExists(previousObject);
  }

  const signedUrl = await signedUrlForObject(objectName);
  return {
    originalPath: objectName,
    objectName,
    signedUrl,
  };
}

export async function saveSonificationFromUrl(
  mushId: string,
  kind: SonificationKind,
  url: string,
  options: { fallbackName?: string } = {},
): Promise<SonificationStoredValue> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download audio from ${url} (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType =
    response.headers.get("content-type") || "audio/mpeg";

  return saveSonificationBuffer(mushId, kind, buffer, {
    originalName: options.fallbackName,
    contentType,
  });
}
