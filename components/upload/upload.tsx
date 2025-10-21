"use client";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; // <-- toggle

type UploadPageProps = {
  onClose?: () => void;
  onUploaded?: (payload: unknown) => void;
  className?: string;
};

export const UploadPage = ({ onClose, onUploaded, className }: UploadPageProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("");
  const [realtime, setRealtime] = useState<boolean>(false); // <-- default ON

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const reset = () => {
    setBusy(false);
    setStatus(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setName("");
    setDescription("");
    setKind("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!name || !kind) {
      setError("Please provide a name and mushroom kind before uploading.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name);
    fd.append("description", description);
    fd.append("kind", kind);
    fd.append("userId", "demo-user-123");

    const endpoint = realtime ? "/api/realtime_upload" : "/api/mushrooms";

    setBusy(true);
    setStatus(`Uploading ${file.name}… (${realtime ? "realtime" : "batch"})`);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = (await res.json()) as Record<string, unknown> | null;
      if (!res.ok) {
        const message =
          typeof json?.error === "string" ? json.error : "Upload failed";
        throw new Error(message);
      }
      setStatus(`Uploaded ${file.name}${realtime ? " (realtime started)" : ""}`);
      onUploaded?.(json);
      setTimeout(() => {
        onClose?.();
        reset();
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setBusy(false);
    }
  };

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Mode toggle */}
      <div className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
        <div className="space-y-1 text-sm">
          <div className="font-medium">Upload in real time</div>
          <div className="text-muted-foreground">
            {realtime
              ? "Streams 1 row/sec and publishes to Pub/Sub for live charts."
              : "Uploads using the standard batch API."}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-1 rounded ${
              realtime ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {realtime ? "/api/realtime_upload" : "/api/mushrooms"}
          </span>
          <Switch checked={realtime} onCheckedChange={setRealtime} disabled={busy} />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-dashed border-muted-foreground/50 bg-muted/30 p-5 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="mushroom-name" className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
              Name
            </Label>
            <Input
              id="mushroom-name"
              placeholder="e.g. Ghost Fungi #7"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mushroom-desc" className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
              Description
            </Label>
            <Textarea
              id="mushroom-desc"
              placeholder="Optional notes about substrate, environment, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
              Mushroom kind
            </Label>
            <Select
              value={kind}
              onValueChange={(value) => setKind(value)}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Oyster">Oyster</SelectItem>
                <SelectItem value="Shiitake">Shiitake</SelectItem>
                <SelectItem value="Enokitake">Enokitake</SelectItem>
                <SelectItem value="King Oyster">King Oyster</SelectItem>
                <SelectItem value="Ghost Fungi">Ghost Fungi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-xl bg-white/80 px-4 py-3 text-xs text-muted-foreground shadow-inner">
          Attach the CSV exported from your sensor rig. We map timestamps to <code>Timestamp</code> and millivolts to{" "}
          <code>Signal_mV</code> before pushing to BigQuery.
        </div>

        <Button
          type="button"
          onClick={handleButtonClick}
          disabled={busy || !name || !kind}
          className="w-full rounded-xl bg-[#564930] font-semibold text-white shadow-md transition hover:bg-[#423621] disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Choose CSV"}
        </Button>
      </div>
      {status && !error ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {status}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      ) : null}
    </div>
  );
};
