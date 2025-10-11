// "use client";
// import { useState } from "react";

// export const UploadPage = () => {
//   const [busy, setBusy] = useState(false);

//   const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
//     if (!file) return alert("Pick a CSV");
//     const fd = new FormData();
//     fd.append("file", file);

//     setBusy(true);
//     const res = await fetch("/api/upload", { method: "POST", body: fd });
//     const json = await res.json();
//     setBusy(false);
//     alert(JSON.stringify(json));
//   };

//   return (
//     <form onSubmit={onSubmit} className="p-6 space-y-3">
//       <input name="file" type="file" accept=".csv,text/csv" />
//       <button disabled={busy} className="px-3 py-1 bg-blue-600 text-white rounded">
//         {busy ? "Uploading…" : "Upload"}
//       </button>
//     </form>
//   );
// }

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

type UploadPageProps = {
  onClose?: () => void;
  onUploaded?: (payload: any) => void;
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

    setBusy(true);
    setStatus(`Uploading ${file.name}…`);
    setError(null);
    try {
      const res = await fetch("/api/mushrooms", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");
      setStatus(`Uploaded ${file.name}`);
      onUploaded?.(json);
      setTimeout(() => {
        onClose?.();
        reset();
      }, 1200);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
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
          Attach the CSV exported from your sensor rig. We map timestamps to `Timestamp` and millivolts to `Signal_mV` before pushing to BigQuery.
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
