import { BigQuery, BigQueryOptions } from "@google-cloud/bigquery";
import { PubSub, ClientConfig } from "@google-cloud/pubsub";
import fs from "fs";
import path from "path";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

const DEFAULT_KEY_FILE = "mycelium-470904-5621723dfeff.json";

const rawJsonEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const rawBase64Env = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64;
const credentials = resolveCredentials();

const projectId = process.env.GCP_PROJECT_ID ?? "mycelium-470904";
const location = process.env.GCP_LOCATION ?? "australia-southeast1";
const uploadLocation = process.env.BIGQUERY_UPLOAD_LOCATION ?? location;

const datasetId = process.env.BIGQUERY_DATASET_ID ?? "MushroomData";
const detailsTable = process.env.BIGQUERY_DETAILS_TABLE ?? "Mushroom_Details";
const signalsTable = process.env.BIGQUERY_SIGNALS_TABLE ?? "Mushroom_Signal";
const uploadDatasetId = process.env.BIGQUERY_UPLOAD_DATASET_ID ?? "MushroomData1";
const uploadSignalsTable =
  process.env.BIGQUERY_UPLOAD_SIGNALS_TABLE ?? "MushroomSignals";
const legacyDatasetId =
  process.env.BIGQUERY_LEGACY_DATASET_ID ?? uploadDatasetId;
const legacyTableName = process.env.BIGQUERY_LEGACY_TABLE ?? "Table1";

const pubsubTopic = process.env.GCP_PUBSUB_TOPIC ?? "bigquery-signal-stream";
const pubsubSubscription =
  process.env.GCP_PUBSUB_SUBSCRIPTION ?? "bigquery-signal-sub";

export const googleConfig = {
  projectId,
  location,
  datasetId,
  detailsTable,
  signalsTable,
  uploadDatasetId,
  uploadSignalsTable,
  uploadLocation,
  legacyDatasetId,
  legacyTableName,
  pubsubTopic,
  pubsubSubscription,
};

let bigQueryClient: BigQuery | null = null;
export function getBigQueryClient(): BigQuery {
  if (!bigQueryClient) {
    const options: BigQueryOptions = {
      projectId: googleConfig.projectId,
      location: googleConfig.location,
    };
    if (credentials) {
      options.credentials = credentials;
    }
    bigQueryClient = new BigQuery(options);
  }
  return bigQueryClient;
}

let pubSubClient: PubSub | null = null;
export function getPubSubClient(): PubSub {
  if (!pubSubClient) {
    const options: ClientConfig = { projectId: googleConfig.projectId };
    if (credentials) {
      options.credentials = credentials;
    }
    pubSubClient = new PubSub(options);
  }
  return pubSubClient;
}

function resolveCredentials(): ServiceAccount | undefined {
  const value =
    rawJsonEnv ??
    (rawBase64Env ? Buffer.from(rawBase64Env, "base64").toString("utf8") : null);
  if (value) {
    const parsed = tryParseJson(value);
    if (parsed) return parsed;
  }

  const explicitPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS_FILE;
  if (explicitPath) {
    const resolvedPath = path.resolve(process.cwd(), explicitPath);
    const parsed = tryReadJson(resolvedPath);
    if (parsed) return parsed;
  }

  const fallbackPath = path.resolve(process.cwd(), DEFAULT_KEY_FILE);
  return tryReadJson(fallbackPath);
}

function tryParseJson(value: string): ServiceAccount | undefined {
  try {
    return JSON.parse(value) as ServiceAccount;
  } catch {
    return undefined;
  }
}

function tryReadJson(filePath: string): ServiceAccount | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    const contents = fs.readFileSync(filePath, "utf8");
    return JSON.parse(contents) as ServiceAccount;
  } catch {
    return undefined;
  }
}
