"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { drawVoronoiChart } from "@/components/portfolio/network/Network";
import React, { useRef, useState, useEffect } from "react";
import { MushroomSprite } from "@/components/portfolio/PixelMushrooms";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";

export const description = "Real-time analysis of Differential Voltage feed with network diagram.";

export function Analysis() {
  const [rawSignals, setRawSignals] = useState<number[]>([]);
  const [times, setTimes] = useState<number[]>([]);
  const [visibleData, setVisibleData] = useState<{ timestamp: number; signal: number }[]>([]);
  const [mappedSpeeds, setMappedSpeeds] = useState<number[]>([]);
  const [normalizedBaseline, setNormalizedBaseline] = useState<number[]>([]);
  const [spikes, setSpikes] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const chartConfig = {
    signal: {
      label: "Signal",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  // --- Line chart CSV worker ---
  useEffect(() => {
    const worker = new Worker("/Workers/ExtractSignals.js");

    fetch("/GhostFungi.csv")
      .then(res => res.text())
      .then(csvText => worker.postMessage({ type: "csv", data: csvText }));

    worker.onmessage = event => {
      const { signals, times: workerTimes, mappedSpeeds: speeds, normalizedBaseline: baseline, error } = event.data;
      if (error) {
        console.error(error);
        return;
      }
      setRawSignals(signals);
      setTimes(workerTimes);
      setMappedSpeeds(speeds || []);
      setNormalizedBaseline(baseline || []);
      setVisibleData([]);
      setCurrentIndex(0);
    };

    return () => worker.terminate();
  }, []);

  // --- Initialize Voronoi ---
  useEffect(() => {
    if (!svgRef.current) return;

    const ProcessDataWorker = new Worker("/Workers/ProcessData.js");
    let cleanup: (() => void) | null = null;

    fetch("/GhostFungi.csv")
      .then(res => res.text())
      .then(csvText => ProcessDataWorker.postMessage({ type: "csv", data: csvText }));

    ProcessDataWorker.onmessage = event => {
      const { mappedSpeeds: workerSpeeds, normalizedBaseline: workerBaseline, spikes: workerSpikes, error } = event.data;
      if (error) {
        console.error(error);
        return;
      }

      cleanup = drawVoronoiChart(
        svgRef.current!,
        800,
        600,
        workerSpeeds,
        workerBaseline,
        workerSpikes // <-- pass spikes to the chart
      );

      setMappedSpeeds(workerSpeeds);
      setNormalizedBaseline(workerBaseline);
      setSpikes(workerSpikes); // <-- store spikes in state
    };

    return () => {
      ProcessDataWorker.terminate();
      if (cleanup) cleanup();
    };
  }, []);

  // --- Stream signals using times array ---
  useEffect(() => {
    if (!rawSignals.length || !times.length || !mappedSpeeds.length || !normalizedBaseline.length || !spikes.length) return;

    let index = 0;
    const interval = setInterval(() => {
      setVisibleData(prev => [
        ...prev,
        { timestamp: times[index], signal: rawSignals[index] },
      ]);

      setCurrentIndex(index);

      index++;
      if (index >= rawSignals.length) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [rawSignals, times, mappedSpeeds, normalizedBaseline, spikes]);

  return (
    <>
      <h1 className="text-center text-xl">{description}</h1>
      <h5 className="text-gray-700 text-center italic mb-5">Metrics update in real time, showing the current state of electrical activity in the network as
         points are plotted.</h5>
      <div className="mx-auto mb-10 h-px w-1/4 bg-[#564930]"></div>

      {/* Line chart card */}
      <Card className="py-4 sm:py-0 mb-10">
        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
            <CardTitle className="pt-3">Electrical Signals</CardTitle>
            <CardDescription className="pb-1">Real-time feed (auto zoom out)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <ChartContainer config={chartConfig} className="w-full h-[300px]">
            <LineChart data={visibleData} margin={{ top: 12, right: 15, left: 12, bottom: 30 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={20}
                label={{ value: "Time (s)", position: "bottom", offset: 15 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                label={{ value: "Δ Voltage Difference (mV)", angle: -90, position: "insideLeft", dy: 55, offset: -5 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    nameKey="signal"
                    labelFormatter={v => `Time: ${Number(v).toFixed(2)} s`}
                  />
                }
              />
              <Line
                dataKey="signal"
                type="monotone"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Voronoi network card */}
      <Card className="p-4 sm:p-6 flex flex-col gap-4">
        <div>
          <CardTitle>Network Diagram</CardTitle>
          <CardDescription className="pt-1">
            Real-time visualization of mushroom electrical activity patterns
          </CardDescription>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Voronoi chart */}
          <div className="flex-[3] rounded-2xl overflow-hidden shadow-md border border-gray-300/50 max-h-[600px]">
            <svg
              ref={svgRef}
              viewBox="0 0 800 600"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-auto"
            ></svg>
          </div>

          {/* Metrics panel */}
          <div className="flex-[1] flex flex-col gap-4 justify-center">
            <h2 className="text-lg font-semibold text-center">Metrics</h2>
            <div className="mx-auto h-px w-3/4 bg-[#564930]"></div>

            <Card className="p-2 bg-gray-50 rounded-2xl shadow-inner">
              <CardTitle className="text-sm font-semibold">Rate of Change</CardTitle>
              <CardContent className="text-lg font-bold p-0 flex flex-col items-center">
                <span>{mappedSpeeds[currentIndex]?.toFixed(3) ?? "-"}</span>
                {currentIndex > 0 && mappedSpeeds[currentIndex - 1] !== undefined && (
                  <span className="text-sm text-gray-500">
                    {mappedSpeeds[currentIndex] - mappedSpeeds[currentIndex - 1] >= 0 ? "+" : ""}
                    {(mappedSpeeds[currentIndex] - mappedSpeeds[currentIndex - 1]).toFixed(3)}
                  </span>
                )}
              </CardContent>
            </Card>

            <Card className="p-2 bg-gray-50 rounded-2xl shadow-inner">
              <CardTitle className="text-sm font-semibold">Baseline Drift</CardTitle>
              <CardContent className="text-lg font-bold p-0 items-center flex flex-col">
                {normalizedBaseline[currentIndex]?.toFixed(3) ?? "-"}
              </CardContent>
            </Card>

            <Card className="p-2 bg-gray-50 rounded-2xl shadow-inner">
              <CardTitle className="text-sm font-semibold">Spike Detected</CardTitle>
              <CardContent className="text-lg font-bold p-0 items-center flex flex-col">
                {spikes[currentIndex] === 1 ? "Yes" : "No"}
              </CardContent>
            </Card>

            {/* Horizontal Mushroom Sprites */}
            <div className="flex gap-5 mt-2 justify-center">
              <MushroomSprite species="flyAgaric" size={40} duration={1.5} />
              <MushroomSprite species="shiitake" size={40} duration={1.5} />
              <MushroomSprite species="oyster" size={40} duration={1.5} />
              <MushroomSprite species="flyAgaric" size={40} duration={1.5} />
            </div>
          </div>
        </div>
      </Card>
            {/* Legend Accordion */}
      <div className="mt-4 w-full">
        <div
          onClick={() => setLegendOpen(!legendOpen)}
          className="cursor-pointer bg-[#564930] text-white rounded-md p-2 font-semibold flex justify-between items-center"
        >
          Legend
          <span
            className={`ml-2 inline-block transform transition-transform duration-300 ${
              legendOpen ? "rotate-90" : ""
            }`}
          >
            &#9654;
          </span>
        </div>

        <div
  ref={contentRef}
  className="overflow-hidden transition-all duration-500 ease-in-out mt-2"
  style={{ height: legendOpen ? `${contentRef.current?.scrollHeight}px` : "0px" }}
>
  <ul className="text-sm text-white bg-[#564930] rounded-md p-2">
    <li className="flex flex-col gap-1 p-2 rounded-md">
      <span className="font-semibold">Background = Baseline Drift</span>
      <span className="text-xs">
        The background color shows the mushroom’s baseline electrical signals, calculated as a moving average. 
        A cooler tone background indicates lower average activity, while warmer indicates higher average activity, 
        highlighting increased electrical activity and overall 'excitability' in the mushroom.
      </span>
    </li>
    <li className="flex flex-col gap-1 p-2 rounded-md">
      <span className="font-semibold">Ripples = Rate of Change</span>
      <span className="text-xs">
        Ripples along the network lines represent changes in the mushroom’s electrical signals over time. Faster-moving ripples indicate greater fluctuations in signal magnitude, 
        highlighting moments of heightened activity in the network, which can indicate potential responses to stimuli. Slow ripples depict small 
        differences in rate of change between consecutive dataset points, which may indicate the network is relatively stable.
      </span>
    </li>
    <li className="flex flex-col gap-1 p-2 rounded-md">
      <span className="font-semibold">Ripple Colors</span>
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-teal-400 rounded-full"></span>
          Teal — normal fluctuations.
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
          Gold — strong spike, unusual activity.
        </span>
      </div>
    </li>
  </ul>
</div>
      </div>
    </>
  );
}
