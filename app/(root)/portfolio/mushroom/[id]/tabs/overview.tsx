import { ChartLineInteractive } from "@/components/portfolio/summaryLineChart";
import {SonificationPanel} from "@/components/portfolio/SonificationPanel"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MushroomGarden, MushroomSprite } from "@/components/portfolio/PixelMushrooms";
import { useParams } from "next/navigation";
import React, { useMemo } from "react";

export default function Overview() {
  const { id } = useParams<{ id: string }>();

  const mushId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : 1; // safe fallback
  }, [id]);

  return (
    <><div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6">
      {/* Left side (65%) */}
      <div>
        <ChartLineInteractive mushId={mushId} />
      </div>

      {/* Right side (35%) */}
      <div className="flex flex-col gap-1">
        <Card>
          <CardHeader>
            <CardTitle>Mushroom #{id} Details:</CardTitle>
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
        <main className="space-y-6">
          <SonificationPanel csvUrl="/GhostFungi.csv" />
        </main>

      </div>
    </div>
    <div className="flex flex-col items-center justify-center p-10">
        <MushroomSprite species="flyAgaric" size={160} duration={2.2} /><MushroomSprite species="shiitake" size={160} duration={2.2} /><MushroomSprite species="oyster" size={160} duration={2.2} />
    </div>
    </>
  );
}
