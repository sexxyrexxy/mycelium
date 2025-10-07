"use client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const headers = Object.keys(rows[0] ??{});
    const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    (async () => {
      try {
        // If your API file is app/api/data/route.ts, change to "/api/data"
        const res = await fetch("/api/query", { cache: "no-store" });
        if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("API did not return an array");
        setRows(data);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-64" />
        <div className="overflow-hidden rounded-lg border">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <th key={idx} className="border px-3 py-2 text-left">
                    <Skeleton className="h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, rowIdx) => (
                <tr key={rowIdx} className="border-t">
                  {Array.from({ length: 5 }).map((_, colIdx) => (
                    <td key={colIdx} className="border px-3 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  if (error && !rows.length)
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600">
          {error}
        </div>
      </div>
    );

  if (!rows.length)
    return (
      <div className="p-6">
        <div className="rounded-md border border-dashed border-muted-foreground/40 px-4 py-6 text-sm text-muted-foreground">
          No data found.
        </div>
      </div>
    );

  return (
  <div className="p-6">
      <h1 className="text-xl font-bold mb-4">BigQuery Data (first 100 rows)</h1>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {headers.map((key) => (
                <th
                  key={key}
                  className="border px-3 py-2 text-left text-sm font-medium text-gray-700"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {headers.map((key) => (
                  <td key={key} className="border px-3 py-2 text-sm">
                    {String(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
