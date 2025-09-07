// sonify.js
// CSV-only version for files where the first column is time (may be BLANK header)
// and the second column is "Signal MV". Time is HH:MM:SS.
// Also auto-detects comma or tab delimiter.

window.Sonify = (function () {
  // ---------- helpers ----------
  function stripBOM(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }

  function detectDelimiter(line) {
    // crude but effective: prefer tab if present, else comma
    const tabs = (line.match(/\t/g) || []).length;
    const commas = (line.match(/,/g) || []).length;
    return tabs > commas ? "\t" : ",";
  }

  function parseHHMMSS(s) {
    if (typeof s !== "string") s = String(s ?? "");
    const parts = s.trim().split(":");
    if (parts.length < 2) return NaN;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const sec = parts[2] ? parseFloat(parts[2]) : 0;
    return h * 3600 + m * 60 + (Number.isFinite(sec) ? sec : 0);
  }

  function movingAverage(arr, win = 5) {
    if (win <= 1) return arr.slice();
    const out = new Array(arr.length);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum += arr[i];
      if (i >= win) sum -= arr[i - win];
      const denom = Math.min(i + 1, win);
      out[i] = sum / denom;
    }
    return out;
  }

  function normalizeCentered(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const centered = arr.map(v => v - mean);
    const peak = Math.max(1e-9, ...centered.map(v => Math.abs(v)));
    return centered.map(v => v / peak);
  }

  function downsample(times, values, targetHz = 100) {
    const outT = [], outV = [];
    if (!times.length) return { times: outT, values: outV };
    const t0 = times[0];
    const dt = 1 / targetHz;
    let nextT = t0;

    for (let i = 0; i < times.length - 1; i++) {
      const t1 = times[i], t2 = times[i + 1];
      const v1 = values[i], v2 = values[i + 1];
      while (nextT >= t1 && nextT < t2) {
        const a = (nextT - t1) / Math.max(1e-9, t2 - t1);
        outT.push(nextT);
        outV.push((1 - a) * v1 + a * v2);
        nextT += dt;
      }
    }
    outT.push(times[times.length - 1]);
    outV.push(values[values.length - 1]);
    return { times: outT, values: outV };
  }

  function mapLin(v, inMin, inMax, outMin, outMax) {
    const a = (v - inMin) / (inMax - inMin);
    return outMin + a * (outMax - outMin);
  }

  // ---------- module state ----------
  let rawTimesSec = [];
  let rawVolts = [];
  let osc, filter, limiter;
  let audioReady = false;

  // ---------- CSV loader (handles blank time header + Signal MV) ----------
  async function loadData(csvUrl) {
    const res = await fetch(encodeURI(csvUrl), { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
    let text = await res.text();
    text = stripBOM(text);

    // split lines; ignore trailing blanks
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) throw new Error("CSV appears empty");

    const delimiter = detectDelimiter(lines[0]);

    // header row (may contain empty first col)
    const header = lines[0].split(delimiter).map(s => s.trim());
    // Expect something like: ["", "Signal MV"] or ["Signal MV"] if a single column
    // We'll try to detect time in col 0 by content if header is blank.

    // Build rows
    const rows = lines.slice(1).map(l => l.split(delimiter));

    // Decide indices
    let timeIdx = -1;
    let valIdx = -1;

    // First, try to find "Signal MV" (case-insensitive) as value column
    valIdx = header.findIndex(h => /^signal\s*mv$/i.test(h));
    if (valIdx === -1) {
      // If not in header, assume the LAST column is the value (common in your sample)
      valIdx = Math.max(0, (header.length || rows[0].length) - 1);
    }

    // Time index: prefer first column (0) if header is blank and it looks like HH:MM:SS in data
    if (header[0] === "" || header[0] == null) {
      // heuristic: check a few rows for HH:MM:SS
      const looksLikeTime = rows.slice(0, 5).every(r => r[0] && r[0].includes(":"));
      if (looksLikeTime) timeIdx = 0;
    }
    // If still not set, try to match common time headers
    if (timeIdx === -1) {
      const guess = header.findIndex(h => /^(unnamed:\s*0|time|time_s|timestamp)$/i.test(h));
      if (guess >= 0) timeIdx = guess;
    }
    // Final fallback: if there are at least 2 columns, assume first is time
    if (timeIdx === -1 && (header.length >= 2 || rows[0].length >= 2)) {
      timeIdx = 0;
    }

    if (timeIdx < 0 || valIdx < 0) {
      throw new Error(`Could not find time/value columns. Saw headers: ${header.join(" | ")}`);
    }

    // Parse
    const tsec = [];
    const volts = [];
    for (const r of rows) {
      const tRaw = (r[timeIdx] ?? "").trim();
      const vRaw = (r[valIdx] ?? "").trim();
      if (!tRaw || !vRaw) continue;

      const t = parseHHMMSS(tRaw);
      const v = parseFloat(vRaw);
      if (!Number.isFinite(t) || !Number.isFinite(v)) continue;

      if (tsec.length && t < tsec[tsec.length - 1]) {
        // enforce non-decreasing time
        continue;
      }
      tsec.push(t);
      volts.push(v);
    }

    if (tsec.length < 2) throw new Error("Not enough valid rows after parsing.");

    rawTimesSec = tsec;
    rawVolts = volts;

    return {
      rows: tsec.length,
      tStart: tsec[0],
      tEnd: tsec[tsec.length - 1],
      vMin: Math.min(...volts),
      vMax: Math.max(...volts),
    };
  }

  // ---------- audio graph ----------
  function setupAudioIfNeeded() {
    if (audioReady) return;
    osc = new Tone.Oscillator({ type: "sine", frequency: 220 }).start();
    filter = new Tone.Filter({ frequency: 1000, type: "lowpass", Q: 0.5 });
    limiter = new Tone.Limiter(-1).toDestination();
    osc.connect(filter).connect(limiter);
    audioReady = true;
  }

async function startSonification(options = {}) {
  if (!rawTimesSec.length) throw new Error("Call loadData() first.");

  const {
    // playback scaling
    timeCompression = 50,
    // smoothing & control density
    smoothingWindow = 5,
    controlRateHz = 100,
    // mapping ranges
    freqMin = 220,
    freqMax = 660,
    cutoffMin = 300,
    cutoffMax = 5000,
  } = options;

  await Tone.start(); // ensure user gesture
  setupAudioIfNeeded();

  // 1) preprocess
  const smoothed = movingAverage(rawVolts, smoothingWindow);
  const norm = normalizeCentered(smoothed);

  // 2) resample onto a uniform control grid (critical for value curves)
  const { times, values } = downsample(rawTimesSec, norm, controlRateHz);
  if (times.length < 2) throw new Error("Not enough points after resampling.");

  // 3) map control values (-1..1) to target params
  //    setValueCurveAtTime expects evenly spaced samples over the duration
  const freqArray = new Float32Array(values.length);
  const cutoffArray = new Float32Array(values.length);

  for (let i = 0; i < values.length; i++) {
    const v = values[i]; // -1..1
    // map to frequency / cutoff
    let f = mapLin(v, -1, 1, freqMin,   freqMax);
    let c = mapLin(v, -1, 1, cutoffMin, cutoffMax);
    // safety clamps
    if (f < 1) f = 1;
    if (c < 10) c = 10;
    freqArray[i]   = f;
    cutoffArray[i] = c;
  }

  // 4) schedule param curves in one shot
  const now = Tone.now();
  const duration = (times[times.length - 1] - times[0]) / timeCompression;

  // clear any previous automation that might extend into our window
  osc.frequency.cancelAndHoldAtTime(now);
  filter.frequency.cancelAndHoldAtTime(now);

  // set the curves; Tone will distribute the array uniformly over `duration`
  osc.frequency.setValueCurveAtTime(freqArray, now, duration);
  filter.frequency.setValueCurveAtTime(cutoffArray, now, duration);
}


  function stopSonification() {
    if (!audioReady) return;
    try { osc.stop("+0.05"); } catch {}
    try { filter.dispose(); } catch {}
    try { limiter.dispose(); } catch {}
    audioReady = false;
  }

  return {
    loadData,
    startSonification,
    stopSonification,
  };
})();
