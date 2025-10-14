"use client";

import { useEffect, useState, useCallback } from "react";
import { UploadPage } from "@/components/upload/upload";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Kavoon } from "next/font/google";
const kavoon = Kavoon({ subsets: ["latin"], weight: "400" });

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
  const [showUploader, setShowUploader] = useState(false);
  const [uploadBanner, setUploadBanner] = useState<string | null>(null);

  const loadMushrooms = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    loadMushrooms();
  }, [loadMushrooms]);

  return (
    <>
      <div className="space-y-6">
        <div
          className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-10 sm:px-6 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/portfolio-background.jpg')",
          }}
        >
          <div>
            <h1
              className={`font-bold text-4xl md:text-4xl text-white ${kavoon.className} drop-shadow-[2px_2px_4px_rgba(0,0,0,0.6)]`}
            >
              My Mushrooms
            </h1>
            <p className="text-sm text-white/80">
              Track every specimen across devices with responsive cards and
              tables.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUploader(true)}
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#564930] shadow-md transition hover:bg-[#e1c390]"
          >
            Upload CSV
          </button>
        </div>

        {uploadBanner ? (
          <div className="mx-4 sm:mx-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {uploadBanner}
          </div>
        ) : null}

        {loading ? (
          <>
            <div className="hidden md:block overflow-x-auto px-4 sm:px-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2">Mushroom</th>
                    <th className="px-4 py-2">Kind</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-64" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="ml-auto h-6 w-16 rounded-full" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 px-4 sm:px-6 md:hidden">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border bg-background p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-7 w-16 rounded-full" />
                  </div>
                  <Skeleton className="mt-4 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto px-4 sm:px-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2">Mushroom</th>
                    <th className="px-4 py-2">Kind</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2 text-right">Action</th>
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
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/portfolio/mushroom/${mush.MushID}`}
                          className="inline-flex items-center rounded bg-[#AAA432] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#6d6919]"
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

            <div className="grid gap-3 px-4 sm:px-6 md:hidden">
              {mushrooms.map((mush) => (
                <div
                  key={mush.MushID}
                  className="rounded-xl border bg-background p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{mush.Name}</h3>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {mush.Mushroom_Kind}
                      </p>
                    </div>
                    <Link
                      href={`/portfolio/mushroom/${mush.MushID}`}
                      className="rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-green-600"
                    >
                      View
                    </Link>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {mush.Description || "No description yet."}
                  </p>
                </div>
              ))}

              {mushrooms.length === 0 && (
                <div className="rounded-xl border bg-background p-4 text-center text-sm text-muted-foreground">
                  No mushrooms found.
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {showUploader ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-[min(520px,92vw)] rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="absolute right-4 top-4 text-muted-foreground transition hover:text-foreground"
              aria-label="Close uploader"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold text-foreground">
              Import Mushroom Signals
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Drop in a CSV exported from your sensor rig. We will create a new
              mushroom record and stream the readings to the charts instantly.
            </p>
            <div className="mt-6">
              <UploadPage
                onClose={() => setShowUploader(false)}
                onUploaded={() => {
                  setUploadBanner(
                    "Upload successful—your mushroom is syncing now."
                  );
                  setShowUploader(false);
                  loadMushrooms();
                  setTimeout(() => setUploadBanner(null), 4000);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
