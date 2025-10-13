// lib/sunoUpload.ts

import { authHeaders } from "@/lib/suno";

export async function uploadFileToSuno(
  file: File,
  uploadPath = "user-uploads",
): Promise<string> {
  const form = new FormData();
  form.set("uploadPath", uploadPath);
  form.set("fileName", file.name || "sonification-upload.wav");
  form.set("file", file);

  const response = await fetch(
    "https://sunoapiorg.redpandaai.co/api/file-stream-upload",
    {
      method: "POST",
      headers: { Authorization: authHeaders().Authorization },
      body: form,
    },
  );

  const raw = await response.text();
  let json: any = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  if (!response.ok || !json?.data?.downloadUrl) {
    throw new Error(json?.msg ?? `File upload failed (${response.status})`);
  }

  return json.data.downloadUrl as string;
}
