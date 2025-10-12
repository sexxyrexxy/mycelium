// lib/suno.ts
export const SUNO_BASE = process.env.SUNO_BASE ?? "https://api.sunoapi.org/api/v1";

export function authHeaders() {
  const key = process.env.SUNO_API_KEY;
  if (!key) throw new Error("Missing SUNO_API_KEY");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}
