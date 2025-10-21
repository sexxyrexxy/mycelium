"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logoutButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, Leaf, Sprout, Users } from "lucide-react";
import { Kavoon } from "next/font/google";
const kavoon = Kavoon({ subsets: ["latin"], weight: "400" });

type Mushroom = {
  MushID: string;
  Name: string;
  Description: string;
  Mushroom_Kind: string;
  UserID: string;
};

type KindSummary = {
  kind: string;
  count: number;
};

const numberFormatter = new Intl.NumberFormat();

const formatCaretaker = (userId: string) => {
  if (!userId) return "Unassigned caretaker";
  const short = userId.slice(0, 4).toUpperCase();
  return `Caretaker ${short}`;
};

export default function Dashboard() {
  const [mushrooms, setMushrooms] = useState<Mushroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMushrooms = async () => {
      try {
        const res = await fetch("/api/mushrooms");
        if (!res.ok) throw new Error("Unable to load mushrooms");
        const data = (await res.json()) as Mushroom[];
        setMushrooms(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(
          "We could not fetch the latest mushroom data. Try again in a moment."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMushrooms();
  }, []);

  const stats = useMemo(() => {
    if (!mushrooms.length) {
      return {
        total: 0,
        species: 0,
        caretakers: 0,
      };
    }

    const kinds = new Set<string>();
    const caretakers = new Set<string>();

    mushrooms.forEach((mush) => {
      if (mush.Mushroom_Kind) kinds.add(mush.Mushroom_Kind);
      if (mush.UserID) caretakers.add(mush.UserID);
    });

    return {
      total: mushrooms.length,
      species: kinds.size,
      caretakers: caretakers.size,
    };
  }, [mushrooms]);

  const kindBreakdown = useMemo<KindSummary[]>(() => {
    const counts = new Map<string, number>();
    mushrooms.forEach((mush) => {
      const key = mush.Mushroom_Kind?.trim() || "Unclassified";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => b.count - a.count);
  }, [mushrooms]);

  const topKind = kindBreakdown[0];
  const displayedMushrooms = mushrooms.slice(0, 3);

  const statCards = [
    {
      label: "Mushrooms tracked",
      value: stats.total,
      icon: Sprout,
      accent: "from-[#564930]/35 to-[#564930]/0",
    },
    {
      label: "Species diversity",
      value: stats.species,
      icon: Leaf,
      accent: "from-[#C89E4D]/35 to-[#C89E4D]/0",
    },
    {
      label: "Active caretakers",
      value: stats.caretakers,
      icon: Users,
      accent: "from-[#AAA432]/30 to-[#AAA432]/0",
    },
    {
      label: "Leading variety",
      value: topKind ? `${topKind.kind} (${topKind.count})` : "-",
      icon: ArrowUpRight,
      accent: "from-[#AA3232]/20 to-[#AA3232]/0",
    },
  ];

  const renderStatValue = (value: number | string) =>
    typeof value === "number" ? numberFormatter.format(value) : value;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-stone-200">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 rounded-3xl bg-white/70 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur-md md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-[#AAA432]">
              Mycelium Intelligence Hub
            </p>
            <h1
              className={`font-bold text-4xl md:text-4xl text-[#564930] ${kavoon.className}`}
            >
              Welcome back - your colony is thriving.
            </h1>
            <p className="max-w-2xl text-sm text-[#564930] sm:text-base">
              Track vitality across every cultivated mushroom. Summaries update
              automatically as new signals stream in from the field.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 rounded-full bg-[#AAA432] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#AAA432]/30 transition hover:bg-[#6e6b2c]"
            >
              Go to portfolio
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <LogoutButton className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100" />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, accent }) => (
            <Card
              key={label}
              className="relative overflow-hidden border-none bg-white/70 shadow-lg ring-1 ring-black/5"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`}
              />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-medium text-[#564930]">
                  {label}
                </CardTitle>
                <Icon className="h-5 w-5 text-[#564930]" />
              </CardHeader>
              <CardContent className="relative z-10">
                {loading ? (
                  <Skeleton className="h-8 w-24 rounded-full" />
                ) : (
                  <p className="text-2xl font-semibold text-[#564930]">
                    {renderStatValue(value)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl bg-white/70 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-stone-900">
                Colony overview
              </h2>
              <p className="text-sm text-stone-600">
                Each card distills the core profile for a mushroom - quick
                context before diving into the full signal story.
              </p>
            </div>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-full border border-[#AAA432] bg-[#fffeeb] px-4 py-2 text-sm font-medium text-[#AAA432] transition hover:bg-[#e5e2ab]"
            >
              Upload new signals
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, idx) => (
                  <Card
                    key={idx}
                    className="border-none bg-white/60 shadow-md ring-1 ring-black/5"
                  >
                    <CardHeader>
                      <Skeleton className="h-5 w-1/2 rounded-full" />
                      <Skeleton className="mt-2 h-4 w-1/3 rounded-full" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full rounded-md" />
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-9 w-full rounded-full" />
                    </CardContent>
                  </Card>
                ))
              : displayedMushrooms.map((mush) => (
                  <Card
                    key={mush.MushID}
                    className="group relative overflow-hidden border-none bg-gradient-to-br from-white/90 via-white/80 to-[#e5e2ab]/60 shadow-lg ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(229,226,171,0.18),transparent_55%)]" />
                    <CardHeader className="relative z-10">
                      <CardTitle className="text-lg font-semibold text-stone-900">
                        {mush.Name || "Unnamed specimen"}
                      </CardTitle>
                      <p className="text-sm font-medium text-[#6c681d]/80">
                        {mush.Mushroom_Kind || "Unclassified species"}
                      </p>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-5">
                      <p className="text-sm text-stone-600">
                        {mush.Description?.trim() ||
                          "No description provided yet. Add a short note in the portfolio tab to document its environment."}
                      </p>
                      <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 px-4 py-2 text-xs font-medium text-stone-600 shadow-inner">
                        <div className="flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-[#AAA432]" />
                          {formatCaretaker(mush.UserID)}
                        </div>
                        <span className="text-[11px] uppercase tracking-wide text-[#6c681d]/80">
                          MushID: {mush.MushID.slice(0, 6)}
                        </span>
                      </div>
                      <Link
                        href={`/portfolio/mushroom/${mush.MushID}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#AAA432] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#AAA432]/30 transition group-hover:bg-[#6c681d]"
                      >
                        View live signals
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
          </div>

          {!loading && mushrooms.length > 3 && (
            <div className="mt-4 flex justify-center">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 rounded-full border border-[#AAA432] bg-white px-5 py-2 text-sm font-semibold text-[#AAA432] shadow-sm transition hover:bg-[#e5e2ab]"
              >
                See all mushrooms
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {!loading && !mushrooms.length && !error && (
            <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-white/60 px-6 py-8 text-center text-sm text-stone-600">
              No mushrooms are linked yet. Import a CSV to seed your first
              profile.
            </div>
          )}
        </section>

        {!!kindBreakdown.length && (
          <section className="mb-12 grid gap-4 md:grid-cols-2">
            <Card className="border-none bg-white/70 shadow-lg ring-1 ring-black/5">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-stone-900">
                  Species mix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {kindBreakdown.map(({ kind, count }) => (
                  <div
                    key={kind}
                    className="flex items-center justify-between rounded-xl border border-stone-100 bg-white/70 px-4 py-2"
                  >
                    <span className="text-sm font-medium text-stone-700">
                      {kind}
                    </span>
                    <span className="text-sm text-stone-500">
                      {count} specimen{count === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-none bg-gradient-to-br from-[#AAA432]/70 to-[#6c681d]/80 shadow-xl ring-1 ring-black/5">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">
                  How to grow the colony
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-emerald-50">
                <p>
                  - Sync new sensor data through the Upload flow to keep the
                  pulse river fresh.
                </p>
                <p>
                  - Invite caretakers so each mushroom has an owner monitoring
                  trends.
                </p>
                <p>
                  - Use the Analysis tab on a specimen to annotate spikes and
                  environmental shifts.
                </p>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
