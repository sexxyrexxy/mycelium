// // app/api/stream/route.ts
// import { NextRequest } from "next/server";
// import { BigQuery } from "@google-cloud/bigquery";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// // ---- CONFIG ----
// const PROJECT_ID = "mycelium-470904";
// const DATASET_ID = "MushroomData";
// const SIGNALS_TABLE = "TEST_Signal";
// const LOCATION = "australia-southeast1";
// const KEY_FILE = "mycelium-470904-5621723dfeff.json";

// // How often to poll BigQuery (ms)
// const DEFAULT_POLL_MS = 2000;

// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url);

//   // REQUIRED: mushId to follow
//   const mushId = searchParams.get("mushId")?.trim();
//   if (!mushId) return new Response("Missing ?mushId=", { status: 400 });

//   // OPTIONAL: ISO timestamp to start after; if missing we’ll start at the current max
//   const startAfter = searchParams.get("startAfter")?.trim() || "";
//   const pollMs = Math.max(
//     1000,
//     Number(searchParams.get("pollMs") ?? DEFAULT_POLL_MS)
//   );

//   const encoder = new TextEncoder();
//   const bq = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_FILE, location: LOCATION });

//   // Track the latest timestamp we've emitted (as string)
//   let lastTs: string | null = startAfter || null;
//   let closed = false;

//   // Helper: query BigQuery for new rows after lastTs (inclusive/exclusive as needed)
//   async function fetchNewRows() {
//     // If we don't have a baseline yet, initialize to current max so we only get future inserts
//     if (!lastTs) {
//       const [mx] = await bq.query({
//         location: LOCATION,
//         query: `
//           SELECT CAST(MAX(Timestamp) AS STRING) AS max_ts
//           FROM \`${PROJECT_ID}.${DATASET_ID}.${SIGNALS_TABLE}\`
//           WHERE MushID = @mushId
//         `,
//         params: { mushId },
//       });
//       lastTs = (mx?.[0] as any)?.max_ts || null;
//       return [];
//     }

//     // Fetch rows strictly newer than lastTs
//     const [rows] = await bq.query({
//       location: LOCATION,
//       query: `
//         SELECT
//           MushID,
//           CAST(Timestamp AS STRING) AS Timestamp,
//           Signal_mV
//         FROM \`${PROJECT_ID}.${DATASET_ID}.${SIGNALS_TABLE}\`
//         WHERE MushID = @mushId
//           AND Timestamp > TIMESTAMP(@lastTs)
//         ORDER BY Timestamp ASC
//         LIMIT 500
//       `,
//       params: { mushId, lastTs },
//     });

//     return rows as Array<{ MushID: string; Timestamp: string; Signal_mV: number }>;
//   }

//   const stream = new ReadableStream({
//     async start(controller) {
//       function sendLine(s: string) {
//         controller.enqueue(encoder.encode(s));
//       }
//       function sendEvent(data: unknown) {
//         sendLine(`data: ${JSON.stringify(data)}\n\n`);
//       }

//       // Handshake + keepalive
//       sendLine(`event: hello\ndata: "connected"\n\n`);
//       const keep = setInterval(() => {
//         sendLine(`event: ping\ndata: "💓"\n\n`);
//       }, 15000);

//       // Polling loop
//       async function loop() {
//         while (!closed) {
//           try {
//             const newRows = await fetchNewRows();

//             if (newRows.length) {
//               // Emit each row (or batch emit; here we batch for fewer frames)
//               sendEvent({ type: "rows", items: newRows });

//               // Advance watermark
//               lastTs = newRows[newRows.length - 1].Timestamp;
//             }
//           } catch (e: any) {
//             sendEvent({ type: "error", message: e?.message ?? "poll failed" });
//           }

//           // Wait before next poll
//           await new Promise((r) => setTimeout(r, pollMs));
//         }
//       }

//       // Close handler
//       const abort = () => {
//         if (closed) return;
//         closed = true;
//         clearInterval(keep);
//         try { controller.close(); } catch {}
//       };

//       // @ts-ignore: ReadableStream signals exist at runtime
//       req.signal?.addEventListener?.("abort", abort);

//       // Kick off loop
//       loop();
//     },
//   });

//   return new Response(stream, {
//     headers: {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache, no-transform",
//       Connection: "keep-alive",
//       "X-Accel-Buffering": "no",
//     },
//   });
// }

// app/api/stream/route.ts
import { NextRequest } from "next/server";
import { PubSub } from "@google-cloud/pubsub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- CONFIG ----
const PROJECT_ID = "mycelium-470904";
const KEY_FILE = "mycelium-470904-5621723dfeff.json";
const SUBSCRIPTION_ID = "bigquery-signal-sub"; // <- your Pub/Sub subscription name

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Heartbeat (keeps connection alive)
      const keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: "💓"\n\n`));
      }, 15000);

      // Setup Pub/Sub client
      const pubsub = new PubSub({
        projectId: PROJECT_ID,
        keyFilename: KEY_FILE,
      });

      const subscription = pubsub.subscription(SUBSCRIPTION_ID);

      // Message handler
      const messageHandler = (message: any) => {
        try {
          const data = JSON.parse(message.data.toString());
          sendEvent({ type: "row", item: data });
        } catch {
          sendEvent({ type: "error", message: "Failed to parse message" });
        }
        message.ack();
      };

      // Listen for new messages
      subscription.on("message", messageHandler);

      // Error handler
      subscription.on("error", (err) => {
        sendEvent({ type: "error", message: err.message });
      });

      // Close cleanup
      const abort = () => {
        clearInterval(keepalive);
        subscription.removeListener("message", messageHandler);
        subscription.close().catch(() => {});
        try { controller.close(); } catch {}
      };

      // @ts-ignore
      req.signal?.addEventListener?.("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
