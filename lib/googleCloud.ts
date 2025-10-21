import { BigQuery, BigQueryOptions } from "@google-cloud/bigquery";
import { PubSub, ClientConfig } from "@google-cloud/pubsub";

type ServiceAccount = {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
};

const INDIVIDUAL_CREDENTIAL_ENV_KEYS = {
  type: "GOOGLE_APPLICATION_CREDENTIALS_TYPE",
  project_id: "GOOGLE_APPLICATION_CREDENTIALS_PROJECT_ID",
  private_key_id: "GOOGLE_APPLICATION_CREDENTIALS_PRIVATE_KEY_ID",
  private_key: "GOOGLE_APPLICATION_CREDENTIALS_PRIVATE_KEY",
  client_email: "GOOGLE_APPLICATION_CREDENTIALS_CLIENT_EMAIL",
  client_id: "GOOGLE_APPLICATION_CREDENTIALS_CLIENT_ID",
  auth_uri: "GOOGLE_APPLICATION_CREDENTIALS_AUTH_URI",
  token_uri: "GOOGLE_APPLICATION_CREDENTIALS_TOKEN_URI",
  auth_provider_x509_cert_url: "GOOGLE_APPLICATION_CREDENTIALS_AUTH_PROVIDER_X509_CERT_URL",
  client_x509_cert_url: "GOOGLE_APPLICATION_CREDENTIALS_CLIENT_X509_CERT_URL",
  universe_domain: "GOOGLE_APPLICATION_CREDENTIALS_UNIVERSE_DOMAIN",
} as const;

type IndividualCredentialKey = keyof typeof INDIVIDUAL_CREDENTIAL_ENV_KEYS;

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

  const fromEnvParts = resolveCredentialsFromIndividualEnv();
  if (fromEnvParts) return fromEnvParts;

  return undefined;
}

function resolveCredentialsFromIndividualEnv(): ServiceAccount | undefined {
  let hasAnyValue = false;
  const credentials: Partial<Record<IndividualCredentialKey, string>> = {};

  for (const [field, envKey] of Object.entries(
    INDIVIDUAL_CREDENTIAL_ENV_KEYS,
  ) as Array<[IndividualCredentialKey, string]>) {
    const value = process.env[envKey];
    if (!value) continue;
    hasAnyValue = true;
    credentials[field] =
      field === "private_key" ? value.replace(/\\n/g, "\n") : value;
  }

  if (!hasAnyValue) return undefined;

  if (!credentials.client_email || !credentials.private_key) {
    if (typeof console !== "undefined") {
      console.warn(
        "[googleCloud] Incomplete GOOGLE_APPLICATION_CREDENTIALS_* variables detected. Expected at least client_email and private_key.",
      );
    }
    return undefined;
  }

  return credentials as ServiceAccount;
}

function tryParseJson(value: string): ServiceAccount | undefined {
  try {
    return JSON.parse(value) as ServiceAccount;
  } catch {
    return undefined;
  }
}
