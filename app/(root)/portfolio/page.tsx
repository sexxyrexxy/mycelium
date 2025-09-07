"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PortfolioItem {
  symbol: string;
  name: string;
  signal: number;
  change: number;
  avgOpen: number;
  pl: number;
  plPercent: number;
  netValue: number;
}

const items: PortfolioItem[] = [
  {
    symbol: "Mushroom1",
    name: "Jack",
    signal: 297.86,
    change: -24.92,
    avgOpen: 319.87287,
    pl: -102.52,
    plPercent: -6.83,
    netValue: 1397.48,
  },
  {
    symbol: "Mushroom2",
    name: "Lois",
    signal: 243.49,
    change: -2.24,
    avgOpen: 260.0,
    pl: -38.15,
    plPercent: -6.36,
    netValue: 561.85,
  },
  {
    symbol: "Mushroom3",
    name: "Adam",
    signal: 70.19,
    change: 0.13,
    avgOpen: 69.17,
    pl: 5.71,
    plPercent: 1.45,
    netValue: 400.54,
  },
];

export default function PortfolioList() {
  return (
    <div>
      <h1 className="text-large font-bold p-5">My Mushrooms</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-2">Mushroom</th>
              <th className="px-4 py-2">Signal</th>
              <th className="px-4 py-2">Avg. Open</th>
              <th className="px-4 py-2">Change</th>
              <th className="px-4 py-2">Change(%)</th>
              <th className="px-4 py-2">Average</th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.symbol} className="border-t text-gray-800">
                <td className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-2">
                    <span>{item.symbol}</span>
                    <span className="text-xs text-gray-500">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {item.signal.toFixed(2)}{" "}
                  <span
                    className={cn(
                      "text-xs ml-1",
                      item.change >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {item.change >= 0 ? "+" : ""}
                    {item.change.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3">{item.avgOpen.toFixed(2)}</td>
                <td
                  className={cn(
                    "px-4 py-3 font-medium",
                    item.pl >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {item.pl >= 0 ? "+" : ""}
                  {item.pl.toFixed(2)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-medium",
                    item.plPercent >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {item.plPercent.toFixed(2)}%
                </td>
                <td className="px-4 py-3 font-medium">
                  {item.netValue.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <button className="bg-red-500 hover:bg-red-600 text-white rounded px-3 py-1 text-xs">
                    End
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button className="bg-green-500 hover:bg-green-600 text-white rounded px-3 py-1 text-xs">
                    <Link href="/portfolio/mushroom">View</Link>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
