"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { UploadPage } from "@/components/upload/upload";
import Link from "next/link";

interface Mushroom {
  MushID: string;
  Name: string;
  Description: string;
  Mushroom_Kind: string;
  UserID: string;
}

export default function PortfolioList() {
  const [mushrooms, setMushrooms] = useState<Mushroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMushrooms() {
      try {
        const res = await fetch("/api/mushrooms");
        if (!res.ok) throw new Error("Failed to fetch mushrooms");
        const data = await res.json();
        setMushrooms(data);
      } catch (err) {
        console.error("Error fetching mushrooms:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMushrooms();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between p-5">
        <h1 className="text-large font-bold">My Mushrooms</h1>
        <UploadPage />
      </div>

      {loading ? (
        <p className="p-5 text-gray-500">Loading mushrooms...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-2">Mushroom</th>
                <th className="px-4 py-2">Kind</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {mushrooms.map((mush) => (
                <tr key={mush.MushID} className="border-t text-gray-800">
                  <td className="px-4 py-3 font-semibold">{mush.Name}</td>
                  <td className="px-4 py-3">{mush.Mushroom_Kind}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {mush.Description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/portfolio/mushroom/${mush.MushID}`}
                      className="bg-green-500 hover:bg-green-600 text-white rounded px-3 py-1 text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}

              {mushrooms.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center p-5 text-gray-500">
                    No mushrooms found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
