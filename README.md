# Mycelium Signal Studio

Mycelium Signal Studio is an experimental Next.js 15 application for visualising electrical activity captured from cultivated mushrooms. It turns timestamped `Signal_mV` readings into expressive, biology-inspired narratives – from classic time-series dashboards to immersive visuals such as the **Signal River** particle stream and the **Pulse Tavern** bioluminescent mapping.

---

## Highlights

- **Signal River** – HTML5 canvas particle simulation that replays readings sequentially, generates auto-updating narrative cards, and produces a replay overlay when the stream completes.
- **Pulse Tavern** – an immersive bioluminescent visualization that transforms mushroom electrical signals into a glowing underground landscape of rhythmic pulses and shimmering energy bursts.
- **Responsive analytics** – enhanced line charts, multi-range selectors, and interpretation panels tuned for quick scanning on desktop or mobile.
- **BigQuery integration** – seamless ingestion of CSV datasets into `MushroomData.Mushroom_Signal` / `Mushroom_Details` tables via a guided upload flow.
- **Voronoi Diagram** - network visualisation of mushroom's mycelium

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (v4 design tokens) + custom UI components
- **Data**: Google BigQuery (via `@google-cloud/bigquery`)
- **Charts:** Recharts, custom HTML5 Canvas renderers
- **Sound:**

---

## Project Structure

```
app/
  (root)/
    portfolio/               # Portfolio dashboard & mushroom detail pages
      page.tsx               # Portfolio list + modal uploader
      mushroom/[id]/tabs/    # Tabbed visualisations (overview, analysis, river, etc.)
    upload/page.tsx          # Legacy upload screen (now superseded by modal)
components/
  portfolio/                 # Visual components (SignalRiver, GrowthRingChart, etc.)
  upload/                    # Upload modal + helpers
hooks/
  useMushroomSignals.ts      # Range-aware data fetching & down-sampling logic
lib/ ...
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Run the dev server
npm run dev

# Build for production
npm run build
```

> **Note:** Next.js 15 requires Node.js **18.18+** (or 20+). Update your runtime before running `npm run build` or `npm run lint`.

---

## Environment & Credentials

- BigQuery credentials **are not bundled with the repository**. Provide your own service-account JSON following the schema used in `app/api/mushroom/[id]/route.ts`.
- Set the relevant environment variables or place the JSON key in the project root (the code references `mycelium-470904-5621723dfeff.json` by default).
- Upload routes expect the `MushroomData.Mushroom_Signal` and `MushroomData.Mushroom_Details` tables to exist with the column layouts documented inside `app/api/mushrooms/route.ts`.

---

## Key Features

### 1. Portfolio Dashboard

- Responsive table + card views
- Modal CSV uploader mirroring the detailed `MushroomForm` fields
- Success banner + auto-refresh after upload

### 2. Mushroom Detail Tabs

- **Overview:** quick summaries, interpretable cards, care hints
- **Signal River:** live particle stream with auto-generated story blocks and timeline-style history list
- **Analysis:** statistics-rich charts, gradient metric cards, range selector unified with real-time mode
- **Network:** Voronoi network visualisation of electrical activity

### 3. Upload Workflow

- Validates `timestamp, signal` CSV columns
- Streams data into BigQuery staging + permanent tables
- Generates a new `MushID` per upload and attaches descriptive metadata

---

## Testing & Linting

- `npm run lint` – Next.js ESLint preset (requires Node 18.18+)
- Automated tests have not been added yet; manual QA focuses on the dynamic visualisations and BigQuery ingestion flow.

---

## Contributing

1. Fork & branch from `main`
2. Install dependencies and ensure Node ≥ 18.18
3. Follow the existing TypeScript/Tailwind conventions
4. Run linting (`npm run lint`) before opening a PR

For questions about the dataset or to request credentials, reach out to the project maintainers. Remember that production service-account keys must remain secret.

---

## References

AI was used for debugging of code

© Mycelium Signal Studio – visualising fungal intelligence in real time.
