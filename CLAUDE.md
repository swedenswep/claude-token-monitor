# Claude Code Token Monitor

A real-time dashboard for visualising Claude API token consumption across models (Opus, Sonnet, Haiku). Built with React 19 + Vite, no UI framework — all styling is hand-written vanilla CSS using CSS custom properties.

## Commands

```bash
npm run dev      # start dev server (Vite HMR)
npm run build    # production build
npm run preview  # preview production build
npm run lint     # ESLint check
```

## Architecture

```
src/
  data.js              # MOCK_DATA shape + helper functions (fmtNum, fmtCost, modelColor, pctColor)
  App.jsx              # root component — hooks, layout, expansion manager, tweaks panel
  App.css              # all styles — CSS custom properties, bento grid, animations
  components/
    Shared.jsx         # reusable primitives: Cell wrapper, Spark sparkline, LiveNum
    Cells.jsx          # six bento cards (compact view)
    Expanded.jsx       # six expanded detail panels (full view)
```

## Key Concepts

### Data shape (`src/data.js`)
`MOCK_DATA` is the single source of truth. It contains:
- `plan`, `billing_cycle_start/end` — subscription metadata
- `models[]` — per-model stats: `used`, `limit`, `cost_per_1k`, `sessions_today`, `trend_24h` (24-point hourly array), `daily_7d` (7-point daily array)
- `daily_breakdown[]` — aggregated daily totals for the 7-day chart
- `recent_sessions[]` — session log rows
- `alerts[]` — warn/info messages
- `projects[]` — per-project token share

`useLiveData()` in `App.jsx` wraps `MOCK_DATA` and simulates live updates every 2.2 s by randomly bumping one model's token count.

### Bento grid
Six cell types rendered in a CSS grid (`class="bento"`):
| Cell id | Component | Content |
|---|---|---|
| `summary` | `SummaryCell` | Cycle totals, cost, sessions |
| `chart-7d` | `Chart7dCell` | 7-day bar chart |
| `model-{id}` | `ModelCell` | Per-model usage + progress bar |
| `trend-24h` | `Trend24hCell` | SVG polyline sparklines |
| `countdown` | `CountdownCell` | Billing cycle countdown |
| `sessions` | `SessionsCell` | Recent session list |

### Expansion / FLIP animation (`useExpander`)
Clicking any cell triggers a FLIP-style morph: the cell's bounding rect is captured, a `.clone` overlay is rendered at the same position, then CSS transitions it to full-screen. Collapse reverses the animation. ESC key also collapses. Only one cell can be expanded at a time.

Expanded panels live in `src/components/Expanded.jsx` — each exports an `Exp*` component (e.g. `ExpModel`, `ExpChart7d`) that renders a detail grid inside the clone.

### Shared primitives (`src/components/Shared.jsx`)
- **`Cell`** — wrapper div with hover-glow effect (tracks mouse position via CSS `--mx`/`--my`), eyebrow label, and EXPAND button.
- **`Spark`** — tiny SVG sparkline with optional area fill and terminal dot.
- **`LiveNum`** — number display that flashes (`.tick` class) for 350 ms whenever its value changes.

### Tweaks panel
Slide-in panel toggled by the TWEAKS button. Controls three CSS attributes on `<html>`:
- `data-theme` → `dark` | `light`
- `data-density` → `compact` | `normal` | `roomy`
- `data-accent` → `amber` | `iris` | `mint`

All theme variants are pure CSS via attribute selectors in `App.css`.

## Styling conventions
- CSS custom properties for every design token (colors, radii, spacing, fonts).
- Dark theme is the default; light overrides are in `[data-theme="light"]`.
- Accent hue is a single `--accent` variable swapped by `[data-accent="*"]`.
- Density tweaks only change `--gap`, `--pad`, and `--radius` variables.
- Animations use `var(--ease)` (`cubic-bezier(0.22, 1, 0.36, 1)`) throughout.
- Model colors are hardcoded OKLCH values: Opus = red-ish, Sonnet = amber, Haiku = teal.

## Adding a new metric card
1. Add fields to `MOCK_DATA` in `src/data.js`.
2. Create a `FooCell` in `src/components/Cells.jsx` using `<Cell id="foo" ...>`.
3. Create an `ExpFoo` in `src/components/Expanded.jsx`.
4. Mount `<FooCell>` inside the `.bento` div in `App.jsx`.
5. Wire `ExpFoo` into the `CloneView` switch in `App.jsx`.

## Connecting a real API
Currently all data is mock. To use real Claude usage data:
- Replace `MOCK_DATA` with an API response that matches the same shape.
- Update `useLiveData()` to poll the endpoint (e.g. via `fetch` + `setInterval`) instead of simulating random bumps.
- The Anthropic usage API lives under `https://api.anthropic.com/v1/usage` (requires a valid API key with billing read permissions).
