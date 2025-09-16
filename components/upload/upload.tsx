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

export const UploadPage = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleButtonClick = () => {
    fileInputRef.current?.click(); // open the file picker
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    setBusy(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      alert(JSON.stringify(json));
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Visible button that opens file picker */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={busy}
        className="px-4 py-2 bg-white font-bold text-[#564930] rounded hover:bg-[#c6c6c6] drop-shadow-[2px_2px_4px_rgba(0,0,0,0.6)]"
      >
        {busy ? "Uploading…" : "Upload CSV"}
      </button>
    </div>
  );
};
