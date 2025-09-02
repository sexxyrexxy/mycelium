import { ChartLineInteractive } from "@/components/portfolio/summaryLineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

export default function Page() {
  return (
    <div className="wrapper p-4">
      {/* Use grid with two columns, 65% and 35% */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6">
        {/* Left side (65%) */}
        <div>
          <ChartLineInteractive />
        </div>

        {/* Right side (35%) */}
        <div className="flex flex-col gap-1">
          <Card>
            <CardHeader>
              <CardTitle>Mushroom Details:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <span className="text-gray-500">Electrical Signals:</span>{" "}
                <span className="text-xl font-bold">400mv</span>{" "}
                <span className="text-red-600">-102.52 (-6.83%)</span>
              </p>
              <p>
                <span className="text-gray-500">Average signal:</span> 400
              </p>
              <p className="text-gray-500">Today change: +10</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Signal Strength Analysis:</CardTitle>
            </CardHeader>
            <CardContent className="">
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <p className="text-gray-400 text-sm">Stength</p>
                  <p className="text-green-500 font-bold text-lg">
                    Strong Signal
                  </p>
                </div>
                <div className="h-6 w-px bg-gray-700 mx-4"></div>
                <div className="text-center flex-1">
                  <p className="text-gray-400 text-sm">Target Signal</p>
                  <p className="text-green-500 font-bold text-lg">462.50 mv</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
