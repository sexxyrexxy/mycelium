"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart } from "../../components/shared/chart/index";
import { BigMovers } from "@/components/shared/chart/bigMovers";
import { LogoutButton } from "@/components/auth/logoutButton";

const sampleData = [
  { time: "2025-08-01", value: 400 },
  { time: "2025-08-05", value: 450 },
  { time: "2025-08-10", value: 420 },
  { time: "2025-08-15", value: 460 },
  { time: "2025-08-20", value: 480 },
  { time: "2025-08-25", value: 470 },
];

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 min-h-screen">
      {/* Summary Box - full width */}
      <LogoutButton className="rounded-lg bg-green-600 text-white py-2 px-4 hover:bg-green-700"/>
      <Card className="shadow border border-gray-200 w-full">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart data={sampleData} />
          <p className="text-sm text-gray-500 mt-2">
            Mushroom Signals overview
          </p>
        </CardContent>
      </Card>

      {/* Row with Promo + Big Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Promo Box */}
        <Card className="shadow border border-gray-200">
          <CardHeader>
            <CardTitle>Check Out The Communities Mushrooms</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-gray-700 text-sm">
              Unlock the mycelium network.
            </p>
            <button className="rounded-lg bg-green-600 text-white py-2 px-4 hover:bg-green-700">
              Get Started
            </button>
          </CardContent>
        </Card>

        {/* Big Movers Box */}
        <Card className="shadow border border-gray-200">
          <CardHeader>
            <CardTitle>Big Movers</CardTitle>
          </CardHeader>
          <BigMovers />
        </Card>
      </div>
    </div>
  );
}
