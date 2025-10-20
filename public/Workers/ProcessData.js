// ProcessData.js (Web Worker)

self.onmessage = (event) => {
  const { type, data } = event.data;

  if (type !== "data" || !Array.isArray(data)) return;

  try {
    // --- Extract signals ---
    const signals = data.map((entry) => parseFloat(entry.signal)).filter((val) => !isNaN(val));

    if (signals.length < 2) {
      postMessage({ error: "Not enough valid signal data to process." });
      return;
    }

    // --- Rate of Change ---
    const rates = signals.slice(1).map((val, i) => val - signals[i]);

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
    const windowSize = 300;
    const halfWindow = Math.floor(windowSize / 2);
    const baseline = [];

    for (let i = 0; i < signals.length; i++) {
      let sum = 0, count = 0;
      for (let j = i - halfWindow; j <= i + halfWindow; j++) {
        if (j >= 0 && j < signals.length) {
          sum += signals[j];
          count++;
        }
      }
      baseline.push(sum / count);
    }

    let minBaseline = baseline[0], maxBaseline = baseline[0];
    for (let i = 1; i < baseline.length; i++) {
      if (baseline[i] < minBaseline) minBaseline = baseline[i];
      if (baseline[i] > maxBaseline) maxBaseline = baseline[i];
    }

    const normalizedBaseline = baseline.map(v => (v - minBaseline) / (maxBaseline - minBaseline));

    // --- Spike Detection ---
    const zThreshold = 2;
    const spikeWindow = 30;
    const spikes = [];

    for (let i = 0; i < signals.length; i++) {
      const start = Math.max(0, i - Math.floor(spikeWindow / 2));
      const end = Math.min(signals.length, i + Math.floor(spikeWindow / 2));
      const windowVals = signals.slice(start, end);

      const mean = windowVals.reduce((a, b) => a + b, 0) / windowVals.length;
      const std = Math.sqrt(windowVals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windowVals.length);

      spikes.push(signals[i] > mean + zThreshold * std ? 1 : 0);
    }

    // --- Send processed data back ---
    postMessage({
      mappedSpeeds,
      normalizedBaseline,
      spikes,
    });
  } catch (err) {
    postMessage({ error: "Worker error: " + err.message });
  }
};
