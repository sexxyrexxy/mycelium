"use client";

import React from "react";
import Image from "next/image";
import { MushroomProfile } from "./types";
import Link from "next/link";

// ---------- Mycelium SVG background ----------
const MYCELIUM_BG = `url("data:image/svg+xml;utf8,
  <svg xmlns='http://www.w3.org/2000/svg' width='400' height='240' viewBox='0 0 400 240'>
    <defs>
      <radialGradient id='g' cx='50%%' cy='50%%' r='70%%'>
        <stop offset='0%%' stop-color='%23121A23'/>
        <stop offset='100%%' stop-color='%230A0F14'/>
      </radialGradient>
    </defs>
    <rect width='100%%' height='100%%' fill='url(%23g)'/>
    <g stroke='%23A9E6FF' stroke-opacity='0.18' stroke-width='1' fill='none'>
      <path d='M10,200 C60,160 90,150 140,170 S220,220 260,210 340,160 390,190' />
      <path d='M20,120 C70,80 120,90 160,110 S230,150 270,130 330,80 380,90' />
      <path d='M30,50  C80,30  120,40  160,55  S240,80  280,70  340,40  370,50' />
    </g>
  </svg>")`;

// ---------- Stats subcomponent ----------
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-2 ring-1 ring-white/10">
      <div className="text-[10px] uppercase tracking-wide text-neutral-300">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

// ---------- ProfileCard ----------
export default function ProfileCard({ p }: { p: MushroomProfile }) {
  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 text-neutral-100 shadow-lg shadow-black/30 transition-transform hover:-translate-y-0.5"
      style={{
        backgroundImage: p.coverUrl ? undefined : MYCELIUM_BG,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Optional cover */}
      {p.coverUrl && (
        <div className="absolute inset-0 opacity-70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.coverUrl}
            alt={`${p.kind} mycelium background`}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

      {/* Featured badge */}
      {p.featured && (
        <div className="absolute left-3 top-3 z-10 select-none rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30 backdrop-blur">
          Featured
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl ring-1 ring-white/15">
            <Image
              src={p.avatarUrl}
              alt={`${p.name} avatar`}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{p.name}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-300">
              <span className="rounded-full bg-white/5 px-2 py-0.5 ring-1 ring-white/10">
                {p.kind}
              </span>
              {typeof p.followers === "number" && (
                <span className="opacity-80">
                  {p.followers.toLocaleString()} followers
                </span>
              )}
            </div>
          </div>
        </div>
        {p.bio && (
          <p className="mt-3 line-clamp-2 text-sm text-neutral-300">{p.bio}</p>
        )}
      </div>

      {/* Stats */}
      <div className="relative z-10 grid grid-cols-3 gap-2 border-t border-white/10 p-4 text-center">
        <Stat label="Growth" value={`${p.growthDays}d`} />
        <Stat
          label="Spawned"
          value={p.spawnDate ? new Date(p.spawnDate).toLocaleDateString() : "—"}
        />
        <Stat
          label="Yield"
          value={typeof p.yieldGrams === "number" ? `${p.yieldGrams}g` : "—"}
        />
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 p-3">
        <button
          className="rounded-xl px-3 py-1.5 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white/10"
          aria-label={`View ${p.name}'s profile`}
        >
          <Link href="portfolio/mushroom"></Link>
          View
        </button>
        <button
          className="rounded-xl px-3 py-1.5 text-sm font-medium text-emerald-300 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/10"
          aria-label={`Follow ${p.name}`}
        >
          Follow
        </button>
      </div>
    </article>
  );
}
