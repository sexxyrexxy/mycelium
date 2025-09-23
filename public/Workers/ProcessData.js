// ProcessData.js (Web Worker)
self.onmessage = (event) => {
  if (!event.data || event.data.type !== "csv") return;

  const csvText = event.data.data;


  // --- Parse CSV ---
  const lines = csvText.trim().split("\n");
  const header = lines[0].split(",").map(h => h.trim());
  const signalIndex = header.indexOf("Signal MV"); // adjust if column name is different

  if (signalIndex === -1) {
    postMessage({ error: "CSV missing 'Signal MV' column" });
    return;
  }

  const signals = lines.slice(1).map(line => {
    const cols = line.split(",");
    return parseFloat(cols[signalIndex]);
  });


  // --- Rate of Change ---
  const rates = signals.slice(1).map((val, i) => val - signals[i]);

  // Compute min/max manually
  let minRate = rates[0], maxRate = rates[0];
  for (let i = 1; i < rates.length; i++) {
    if (rates[i] < minRate) minRate = rates[i];
    if (rates[i] > maxRate) maxRate = rates[i];
  }

  const MIN_SPEED = 0.001;
  const MAX_SPEED = 0.2;

  const mappedSpeeds = rates.map(rate =>
    ((rate - minRate) / (maxRate - minRate)) * (MAX_SPEED - MIN_SPEED) + MIN_SPEED
  );


  // --- Baseline Drift (moving average) ---
  const windowSize = 300; // default
  const halfWindow = Math.floor(windowSize / 2);
  const baseline = [];

  for (let i = 0; i < signals.length; i++) {
    let sum = 0, count = 0;

    // Average over windowSize points centered at i
    for (let j = i - halfWindow; j <= i + halfWindow; j++) {
      if (j >= 0 && j < signals.length) {
        sum += signals[j];
        count++;
      }
    }

    baseline.push(sum / count);
  }

  // Compute min/max for normalization
  let minBaseline = baseline[0], maxBaseline = baseline[0];
  for (let i = 1; i < baseline.length; i++) {
    if (baseline[i] < minBaseline) minBaseline = baseline[i];
    if (baseline[i] > maxBaseline) maxBaseline = baseline[i];
  }

  const normalizedBaseline = baseline.map(v => (v - minBaseline) / (maxBaseline - minBaseline));


  // --- Spike Detection ---
  const zThreshold = 2; // adjustable
  const spikeWindow = 50; // number of points for local mean/std
  const spikes = [];

  for (let i = 0; i < signals.length; i++) {
    const start = Math.max(0, i - Math.floor(spikeWindow / 2));
    const end = Math.min(signals.length, i + Math.floor(spikeWindow / 2));
    const windowVals = signals.slice(start, end);

    const mean = windowVals.reduce((a, b) => a + b, 0) / windowVals.length;
    const std = Math.sqrt(windowVals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windowVals.length);

    spikes.push(signals[i] > mean + zThreshold * std ? 1 : 0); // 1 = spike, 0 = normal
  }

  // --- Send all arrays to main thread ---
  postMessage({ mappedSpeeds, normalizedBaseline, spikes });
};
