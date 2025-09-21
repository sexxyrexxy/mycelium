// ExtractSignals.js (Web Worker)
self.onmessage = (event) => {
  if (!event.data || event.data.type !== "csv") return;

  const csvText = event.data.data;

  const lines = csvText.trim().split("\n");
  const header = lines[0].split(",").map(h => h.trim());
  const signalIndex = header.indexOf("Signal MV");

  if (signalIndex === -1) {
    postMessage({ error: "CSV missing 'Signal MV' column" });
    return;
  }

  const signals = [];
  const times = []; // cumulative seconds

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    signals.push(parseFloat(cols[signalIndex]));

    const [h, m, s] = cols[0].split(":").map(Number);
    const totalSeconds = h * 3600 + m * 60 + s;

    if (i === 1) {
      // first measurement at time 0
      times.push(0);
      var prevSeconds = totalSeconds;
      continue;
    }

    const interval = totalSeconds - prevSeconds;
    times.push(times[times.length - 1] + interval); // cumulative
    prevSeconds = totalSeconds;
  }

  // Ensure the first measurement has time 0 if only one line
  if (lines.length === 2) times.push(0);

  postMessage({ signals, times });
};