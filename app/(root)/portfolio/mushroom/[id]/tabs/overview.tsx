import { ChartLineInteractive } from "@/components/portfolio/summaryLineChart";
import { SonificationPanel } from "@/components/portfolio/SonificationPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MushroomSprite } from "@/components/portfolio/PixelMushrooms";
import React, { useState, useRef } from "react";

export default function Overview() {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      {/* Grid with left and right columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6 mb-6">
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
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <p className="text-gray-400 text-sm">Strength</p>
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

        {/* Full-width accordion spanning both columns */}
        <div className="lg:col-span-2 w-full">
          {/* Accordion Header */}
          <div
            onClick={() => setOpen(!open)}
            className="cursor-pointer bg-[#564930] text-white rounded-md p-3 flex items-center gap-3"
          >
            <span className="text-lg font-semibold">
              Understanding Mushroom Electrical Signals
            </span>
            <span
              className={`transform transition-transform duration-300 ${
                open ? "rotate-90" : ""
              }`}
            >
              &#9654;
            </span>
          </div>

          {/* Accordion Content with legend-style styling */}
          <div
            ref={contentRef}
            style={{
              height: open ? `${contentRef.current?.scrollHeight}px` : "0px",
            }}
            className="overflow-hidden transition-all duration-500 ease-in-out mt-2"
          >
            <ul className="bg-[#564930] rounded-md p-2 space-y-2">
              <li className="flex flex-col gap-1 p-2 rounded-md">
                <span className="text-lg text-white font-semibold">
                  What are they?
                </span>
                <span className="text-base text-white">
                  Mushrooms, like many living organisms, use tiny electrical
                  impulses to communicate internally and respond to their
                  environment. These electrical signals are small changes in
                  voltage that flow through the fungal network, similar to how
                  neurons transmit signals in animals. By measuring these
                  signals, we can see how active a mushroom is, how it reacts to
                  stimuli, and possibly determine how healthy it is overall.
                </span>
              </li>
              <li className="flex flex-col gap-1 p-2 rounded-md">
                <span className="text-lg text-white font-semibold">
                  Why are they Important?
                </span>
                <ul className="list-disc list-inside text-base text-white space-y-1">
                  <li>
                    Monitoring Activity: By measuring these signals, we can see
                    when a mushroom is active or responding to changes in its
                    environment.
                  </li>
                  <li>
                    Assessing Health: Healthy mushrooms show distinct patterns
                    in their electrical activity; deviations can indicate stress
                    or problems.
                  </li>
                  <li>
                    Understanding Fungal Networks: Studying these signals helps
                    scientists and cultivators understand how mushrooms
                    communicate and interact within a network.
                  </li>
                </ul>
              </li>

              {/* Horizontal Mushroom Sprites */}
              <div className="flex gap-5 mt-2 justify-center">
                <MushroomSprite species="flyAgaric" size={40} duration={1.5} />
                <MushroomSprite species="shiitake" size={40} duration={1.5} />
                <MushroomSprite species="oyster" size={40} duration={1.5} />
              </div>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
