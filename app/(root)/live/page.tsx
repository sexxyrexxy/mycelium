// "use client";
// import { useEffect, useState } from "react";

// type SignalData = {
//   MushID: string;
//   Timestamp: string;
//   Signal_mV: number;
// };

// export default function RealtimeView() {
//   const [logs, setLogs] = useState<SignalData[]>([]);

//   useEffect(() => {
//     const evtSource = new EventSource("/api/realtime_stream");

//     evtSource.onmessage = (e) => {
//       try {
//         const msg = JSON.parse(e.data);
//         if (msg.type === "row" && msg.item) {
//           setLogs((prev) => [...prev, msg.item]); // append new data
//         }
//       } catch (err) {
//         console.error("Bad message:", err);
//       }
//     };

//     evtSource.onerror = (e) => {
//       console.error("SSE error:", e);
//     };

//     return () => evtSource.close();
//   }, []);

//   return (
//     <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
//       <h1 className="text-2xl font-bold mb-4">📡 Real-Time Mushroom Signal Stream</h1>
//       <div className="bg-gray-800 p-4 rounded-lg shadow-lg overflow-y-auto h-[75vh] font-mono text-sm">
//         {logs.length === 0 ? (
//           <p className="text-gray-500">Waiting for data...</p>
//         ) : (
//           logs.map((row, i) => (
//             <pre
//               key={i}
//               className="border-b border-gray-700 py-1 whitespace-pre-wrap break-words"
//             >
//               {JSON.stringify(row, null, 2)}
//             </pre>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type StreamRow = { MushID: string; Timestamp: string; Signal_mV: number };

export default function LiveChartPage() {
  const [mushId, setMushId] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [points, setPoints] = useState<{ t: string; y: number }[]>([]);
  const sourceRef = useRef<EventSource | null>(null);

  // start / stop SSE
  const connect = () => {
    if (sourceRef.current) sourceRef.current.close();
    const url = mushId ? `/api/realtime_stream?mushId=${encodeURIComponent(mushId)}` : "/api/realtime_stream";
    const es = new EventSource(url);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      if (paused) return;
      try {
        const msg = JSON.parse(e.data);
        // expect: { type: "row", item: { MushID, Timestamp, Signal_mV } }
        if (msg?.type === "row" && msg?.item) {
          const r: StreamRow = msg.item;
          // optional client-side filter if mushId provided
          if (mushId && r.MushID !== mushId) return;
          setPoints((prev) => {
            const next = [...prev, { t: r.Timestamp, y: r.Signal_mV }];
            // keep last N points for performance
            return next.slice(-1000);
          });
        }
        // also handle batched format: { type:"rows", items:[...] }
        if (Array.isArray(msg?.items)) {
          setPoints((prev) => {
            const mapped = msg.items.map((r: StreamRow) => ({
              t: r.Timestamp,
              y: r.Signal_mV,
            }));
            const next = [...prev, ...mapped];
            return next.slice(-1000);
          });
        }
      } catch {}
    };
    sourceRef.current = es;
  };

  const disconnect = () => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setConnected(false);
  };

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
    };
  }, []);

  const chartData = useMemo(
    () => points.map((p) => ({ time: p.t, signal: p.y })),
    [points]
  );

  const formatTick = (v: string) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Live Mushroom Signals</h1>
            <p className="text-sm text-muted-foreground">
              Streaming from <code>/api/stream</code> via Server-Sent Events.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="Optional MushID filter"
              value={mushId}
              onChange={(e) => setMushId(e.target.value)}
            />
            {!connected ? (
              <button
                onClick={connect}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Disconnect
              </button>
            )}
            <button
              onClick={() => setPaused((p) => !p)}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600"
              disabled={!connected}
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={() => setPoints([])}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </header>

        <section className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <div>
              Status:{" "}
              <span className={connected ? "text-green-600" : "text-red-600"}>
                {connected ? "Connected" : "Disconnected"}
              </span>{" "}
              {paused && <span className="ml-2 text-amber-600">(Paused)</span>}
            </div>
            <div className="text-muted-foreground">Points: {chartData.length}</div>
          </div>

          <div className="h-[420px] w-full">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTick}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis
                  dataKey="signal"
                  width={60}
                  tickMargin={8}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(2)} mV`, "Signal"]}
                  labelFormatter={(l: string) =>
                    new Date(l).toLocaleString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  }
                />
                <Line
                  dataKey="signal"
                  type="monotone"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Recent events</h2>
          <div className="max-h-60 overflow-auto rounded-md border bg-muted p-3 font-mono text-xs">
            {points.slice(-50).map((p, i) => (
              <div key={i}>
                {new Date(p.t).toISOString()} — {p.y.toFixed(3)} mV
              </div>
            ))}
            {points.length === 0 && (
              <div className="text-muted-foreground">No data yet. Click “Connect”.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

