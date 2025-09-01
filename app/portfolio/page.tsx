"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PortfolioItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  units: number;
  avgOpen: number;
  pl: number;
  plPercent: number;
  netValue: number;
}

const items: PortfolioItem[] = [
  {
    symbol: "DUOL",
    name: "Duolingo",
    price: 297.86,
    change: -24.92,
    units: 4.68936,
    avgOpen: 319.87287,
    pl: -102.52,
    plPercent: -6.83,
    netValue: 1397.48,
  },
  {
    symbol: "IBM",
    name: "International Business Machines",
    price: 243.49,
    change: -2.24,
    units: 2.30769,
    avgOpen: 260.0,
    pl: -38.15,
    plPercent: -6.36,
    netValue: 561.85,
  },
  {
    symbol: "PYPL",
    name: "PayPal Holdings",
    price: 70.19,
    change: 0.13,
    units: 5.70811,
    avgOpen: 69.17,
    pl: 5.71,
    plPercent: 1.45,
    netValue: 400.54,
  },
];

export default function PortfolioList() {
  return (
    <Card className="w-full overflow-hidden border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-2">Asset</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Units</th>
              <th className="px-4 py-2">Avg. Open</th>
              <th className="px-4 py-2">P/L</th>
              <th className="px-4 py-2">P/L(%)</th>
              <th className="px-4 py-2">Net Value</th>
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
                  {item.price.toFixed(2)}{" "}
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
                <td className="px-4 py-3">{item.units.toFixed(5)}</td>
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
                  ${item.netValue.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <button className="bg-red-500 hover:bg-red-600 text-white rounded px-3 py-1 text-xs">
                    Close
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button className="bg-green-500 hover:bg-green-600 text-white rounded px-3 py-1 text-xs">
                    Trade
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
