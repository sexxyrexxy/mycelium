"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart } from "../../components/shared/chart/index";

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
      <Card className="shadow border border-gray-200 w-full">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart data={sampleData} />
          <p className="text-sm text-gray-500 mt-2">Portfolio overview</p>
        </CardContent>
      </Card>

      {/* Row with Promo + Big Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Promo Box */}
        <Card className="shadow border border-gray-200">
          <CardHeader>
            <CardTitle>Earn Rewards</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-gray-700 text-sm">
              Stake Ethereum to earn monthly rewards while helping secure the
              blockchain network.
            </p>
            <button className="rounded-lg bg-green-600 text-white py-2 px-4 hover:bg-green-700">
              Get Started
            </button>
          </CardContent>
        </Card>

        {/* Big Movers Box */}
        <Card className="shadow border border-gray-200">
          <CardHeader>
            <CardTitle>Movers</CardTitle>
          </CardHeader>
          <CardContent>
            <MoverItem name="mushroom1" change={10.59} />
            <MoverItem name="mushroom2" change={7.1} />
            <MoverItem name="muchroom3" change={2.35} />
            <MoverItem name="mushroom4" change={2.19} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const MoverItem: React.FC<{ name: string; change: number }> = ({
  name,
  change,
}) => (
  <div className="mb-4">
    <div className="flex justify-between text-sm font-medium text-gray-700">
      <span>{name}</span>
      <span className="text-green-600">+{change}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-green-500 h-2 rounded-full"
        style={{ width: `${Math.min(change, 100)}%` }}
      />
    </div>
  </div>
);
