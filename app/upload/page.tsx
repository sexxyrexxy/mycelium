"use client";
import { useState } from "react";

export default function UploadPage() {
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) return alert("Pick a CSV");
    const fd = new FormData();
    fd.append("file", file);

    setBusy(true);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setBusy(false);
    alert(JSON.stringify(json));
  };

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-3">
      <h1 className="text-xl font-bold">Upload CSV → BigQuery</h1>
      <input name="file" type="file" accept=".csv,text/csv" />
      <button disabled={busy} className="px-3 py-1 bg-blue-600 text-white rounded">
        {busy ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
