"use client";
import { useEffect, useState } from "react";


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

  if (loading) return <p className="p-4">Loading...</p>;
  if (!rows.length) return <p className="p-4">No data found</p>;

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
