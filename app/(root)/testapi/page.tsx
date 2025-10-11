// 'use client';

// import React, { useState, useMemo } from 'react';

// type ApiResponse =
//   | {
//       status: 'ok';
//       mode: string;
//       interval_ms: number;
//       mushId: string;
//       insertedSignals: number;
//       totalCsvRows: number;
//     }
//   | { error: string };

// export default function RealtimeUploadTester() {
//   const [file, setFile] = useState<File | null>(null);
//   const [name, setName] = useState('');
//   const [kind, setKind] = useState('');
//   const [userId, setUserId] = useState('');
//   const [description, setDescription] = useState('');
//   const [previewRowCount, setPreviewRowCount] = useState<number | null>(null);
//   const [isUploading, setIsUploading] = useState(false);
//   const [result, setResult] = useState<ApiResponse | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   // naive read to estimate rows (header + data rows)
//   async function handleFileChange(f: File | null) {
//     setFile(f);
//     setResult(null);
//     setError(null);
//     setPreviewRowCount(null);

//     if (!f) return;

//     try {
//       // Only read first ~5MB for speed; adjust as needed
//       const MAX_BYTES = 5 * 1024 * 1024;
//       const slice = await f.slice(0, MAX_BYTES).text();
//       const text = slice.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
//       const lines = text.split('\n').filter(Boolean);
//       if (lines.length <= 1) {
//         setPreviewRowCount(0);
//         return;
//       }
//       // assume header row exists
//       const est = Math.max(lines.length - 1, 0);
//       setPreviewRowCount(est);
//     } catch (e: any) {
//       setPreviewRowCount(null);
//     }
//   }

//   const estimatedSeconds = useMemo(() => {
//     if (previewRowCount == null) return null;
//     return previewRowCount; // 1 row/sec
//   }, [previewRowCount]);

//   async function onSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setError(null);
//     setResult(null);

//     if (!file) {
//       setError('Please choose a CSV file.');
//       return;
//     }
//     if (!name || !kind || !userId) {
//       setError('Please fill in Name, Kind, and User ID.');
//       return;
//     }

//     const form = new FormData();
//     form.append('file', file);
//     form.append('name', name);
//     form.append('description', description);
//     form.append('kind', kind);
//     form.append('userId', userId);

//     setIsUploading(true);
//     try {
//       const res = await fetch('/api/realtime_upload', {
//         method: 'POST',
//         body: form,
//       });
//       const json: ApiResponse = await res.json();
//       if (!res.ok) {
//         setError((json as any)?.error || 'Upload failed');
//       } else {
//         setResult(json);
//       }
//     } catch (err: any) {
//       setError(err?.message || 'Network/Server error');
//     } finally {
//       setIsUploading(false);
//     }
//   }

//   return (
//     <div className="mx-auto max-w-2xl p-6 space-y-6">
//       <h1 className="text-2xl font-semibold">Realtime CSV Upload (1 row/sec)</h1>

//       <form onSubmit={onSubmit} className="space-y-4">
//         <div className="space-y-1">
//           <label className="block text-sm font-medium">CSV File</label>
//           <input
//             type="file"
//             accept=".csv,text/csv"
//             onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
//             disabled={isUploading}
//             className="block w-full"
//           />
//           {previewRowCount != null && (
//             <p className="text-sm text-gray-500">
//               Detected ~{previewRowCount} data rows (excluding header).
//               {estimatedSeconds != null && (
//                 <> Estimated duration: ~{estimatedSeconds}s.</>
//               )}
//             </p>
//           )}
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div className="space-y-1">
//             <label className="block text-sm font-medium">Name</label>
//             <input
//               className="w-full rounded border p-2"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               placeholder="e.g., Shiitake A"
//               disabled={isUploading}
//               required
//             />
//           </div>

//           <div className="space-y-1">
//             <label className="block text-sm font-medium">Kind</label>
//             <input
//               className="w-full rounded border p-2"
//               value={kind}
//               onChange={(e) => setKind(e.target.value)}
//               placeholder="e.g., Lentinula edodes"
//               disabled={isUploading}
//               required
//             />
//           </div>

//           <div className="space-y-1 md:col-span-2">
//             <label className="block text-sm font-medium">User ID</label>
//             <input
//               className="w-full rounded border p-2"
//               value={userId}
//               onChange={(e) => setUserId(e.target.value)}
//               placeholder="e.g., uid_123"
//               disabled={isUploading}
//               required
//             />
//           </div>

//           <div className="space-y-1 md:col-span-2">
//             <label className="block text-sm font-medium">Description (optional)</label>
//             <textarea
//               className="w-full rounded border p-2"
//               rows={3}
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               placeholder="Any notes about this recording…"
//               disabled={isUploading}
//             />
//           </div>
//         </div>

//         <button
//           type="submit"
//           disabled={isUploading || !file}
//           className={`rounded px-4 py-2 text-white ${
//             isUploading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'
//           }`}
//         >
//           {isUploading ? 'Uploading… (please keep this tab open)' : 'Upload CSV'}
//         </button>
//       </form>

//       {error && (
//         <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
//           {error}
//         </div>
//       )}

//       {result && 'status' in result && result.status === 'ok' && (
//         <div className="rounded border border-green-300 bg-green-50 p-3 text-green-800 space-y-1">
//           <div><strong>Upload complete.</strong></div>
//           <div>MushID: <code>{result.mushId}</code></div>
//           <div>Mode: {result.mode}</div>
//           <div>Interval: {result.interval_ms} ms</div>
//           <div>
//             Inserted Signals: {result.insertedSignals} / {result.totalCsvRows}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type ApiResponse =
  | {
      status: 'ok';
      mode: string;
      interval_ms: number;
      mushId: string;
      insertedSignals: number;
      totalCsvRows: number;
      uploadId: string;
    }
  | { error: string };

type SseEvent =
  | { type: 'start'; total: number }
  | { type: 'progress'; inserted: number; total: number; lastTimestamp?: string }
  | { type: 'done'; mushId: string; inserted: number; total: number }
  | { type: 'error'; message: string };

export default function RealtimeUploadTester() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('');
  const [userId, setUserId] = useState('');
  const [description, setDescription] = useState('');
  const [previewRowCount, setPreviewRowCount] = useState<number | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploadId, setUploadId] = useState<string>('');
  const [inserted, setInserted] = useState(0);
  const [total, setTotal] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // generate a fresh uploadId each time the page mounts
    setUploadId(crypto.randomUUID());
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  async function handleFileChange(f: File | null) {
    setFile(f);
    setResult(null);
    setError(null);
    setPreviewRowCount(null);
    setInserted(0);
    setTotal(0);

    if (!f) return;

    try {
      const MAX_BYTES = 5 * 1024 * 1024;
      const slice = await f.slice(0, MAX_BYTES).text();
      const text = slice.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
      const lines = text.split('\n').filter(Boolean);
      const est = Math.max(lines.length - 1, 0);
      setPreviewRowCount(est);
    } catch {}
  }

  const estimatedSeconds = useMemo(() => {
    if (previewRowCount == null) return null;
    return previewRowCount;
  }, [previewRowCount]);

  // Open SSE connection for this uploadId
  function openSse(id: string) {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    const es = new EventSource(`/api/realtime_stream?id=${encodeURIComponent(id)}`);
    es.onmessage = (e) => {
      try {
        const evt: SseEvent = JSON.parse(e.data);
        if (evt.type === 'start') {
          setTotal(evt.total);
          setInserted(0);
        } else if (evt.type === 'progress') {
          setTotal(evt.total);
          setInserted(evt.inserted);
        } else if (evt.type === 'done') {
          setInserted(evt.inserted);
          setTotal(evt.total);
        } else if (evt.type === 'error') {
          setError(evt.message);
        }
      } catch {}
    };
    es.addEventListener('error', () => {
      // network/server error — keep UI as-is, backend may still be inserting
    });
    esRef.current = es;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError('Please choose a CSV file.');
      return;
    }
    if (!name || !kind || !userId) {
      setError('Please fill in Name, Kind, and User ID.');
      return;
    }
    if (!uploadId) {
      setError('No uploadId generated.');
      return;
    }

    // Open SSE BEFORE starting upload
    openSse(uploadId);

    const form = new FormData();
    form.append('file', file);
    form.append('name', name);
    form.append('description', description);
    form.append('kind', kind);
    form.append('userId', userId);
    form.append('uploadId', uploadId);

    setIsUploading(true);
    try {
      const res = await fetch('/api/realtime_upload', { method: 'POST', body: form });
      const json: ApiResponse = await res.json();
      if (!res.ok) {
        setError((json as any)?.error || 'Upload failed');
      } else {
        setResult(json);
      }
    } catch (err: any) {
      setError(err?.message || 'Network/Server error');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Realtime CSV Upload (SSE progress)</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium">CSV File</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            disabled={isUploading}
            className="block w-full"
          />
          {previewRowCount != null && (
            <p className="text-sm text-gray-500">
              Detected ~{previewRowCount} rows. Estimated duration ~{estimatedSeconds ?? 0}s.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              className="w-full rounded border p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Shiitake A"
              disabled={isUploading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Kind</label>
            <input
              className="w-full rounded border p-2"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              placeholder="e.g., Lentinula edodes"
              disabled={isUploading}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">User ID</label>
            <input
              className="w-full rounded border p-2"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g., uid_123"
              disabled={isUploading}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Description (optional)</label>
            <textarea
              className="w-full rounded border p-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes about this recording…"
              disabled={isUploading}
            />
          </div>
        </div>

        <div className="text-xs text-gray-500">Upload ID: <code>{uploadId}</code></div>

        <button
          type="submit"
          disabled={isUploading || !file}
          className={`rounded px-4 py-2 text-white ${
            isUploading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Uploading…' : 'Upload CSV'}
        </button>
      </form>

      {/* Live progress */}
      {(total > 0 || inserted > 0) && (
        <div className="rounded border p-3">
          <div className="font-medium mb-1">Progress</div>
          <div className="text-sm">
            {inserted} / {total} rows inserted
          </div>
          <div className="w-full bg-gray-200 h-2 rounded mt-2">
            <div
              className="bg-green-500 h-2 rounded"
              style={{ width: `${total ? Math.round((inserted / total) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {result && 'status' in result && result.status === 'ok' && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-green-800 space-y-1">
          <div><strong>Upload complete.</strong></div>
          <div>MushID: <code>{result.mushId}</code></div>
          <div>Inserted Signals: {result.insertedSignals} / {result.totalCsvRows}</div>
        </div>
      )}
    </div>
  );
}

