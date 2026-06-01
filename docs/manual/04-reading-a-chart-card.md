# 4. Reading a chart card

Every visualisation on the dashboard lives inside a **chart card** with a consistent layout. Once you understand the parts, you can read any new chart we add in seconds.

## Anatomy of a card

```
┌───────────────────────────────────────────────────────────────┐
│ Title (i)               [optional toggle / button]  [range]   │
│ One-line description.                                         │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                   Chart / table content                       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

| Element | What it does |
|---|---|
| **Title** | What the widget is about. |
| **(i) icon** | Hover for a plain-English explanation of how the value is calculated, the formula, and which source fields it uses. |
| **Toggle / button** | Some cards have a control (e.g. "Mature cohorts only" on Build-date, "All / Top 6 / Clear" on Vetting & regime). |
| **Range chip** | Small chip on the top-right showing the active date window or filter scope (e.g. `2024-01-01 → 2025-10-27`, or `pre Jan-2025`). |
| **Description** | One-line guide on what the chart shows and how to interact with it. |
| **Legend** | Colour key for the series. Always shown. |
| **Tooltip** (on hover) | The data point under your cursor — usually exact counts or percentages. |

## Interaction patterns

The dashboard uses a small number of consistent interactions:

| You see | You can | Result |
|---|---|---|
| A clickable **bar** (e.g. Pareto bar, country bar) | Click it | Adds the value to the global filter; every chart narrows. |
| A **table row** in a People / Drivers / Supply table | Click it | Adds the value to the global filter. |
| A **claim row** (Data Quality grid, Live Activity, NLP search) | Click it | Opens the **claim detail drawer** with the full description, vetter notes, and other claims on the same serial. |
| A **tag** in the description NLP cloud | Click it | Adds the tag to the per-tag trend chart. |
| A **column header** on the Build-date heatmap | Click it | Opens the build-cohort drill panel below. |
| A **vetter row** on the Vetting & regime scorecard | Click it | Toggles that vetter into / out of the per-vetter trend chart. |

## Visual conventions

- **JCB yellow** = primary metric / claim count.
- **Green** = Accept / good.
- **Red** = Reject / bad / DOA / anomaly.
- **Yellow accent** = Z-Code / goodwill / warning.
- **Dashed yellow vertical line** at Jan-2025 = the vetting regime change.
- A **red dot in the top-right of a heatmap cell** = anomaly flag (cell ≥ +2σ above the heatmap mean).

## Empty cards

If a chart looks empty, there are three usual reasons:

1. The current filter eliminates every row (try widening the date range or clicking **Reset**).
2. The data is still loading (the card briefly shows a loading skeleton).
3. There's a real data gap (e.g. time-to-vet only has data on the ~16 % of rows with both `claimDate` and `vettedDate`).

The card's **(i) tooltip** usually mentions any caveat about coverage.

## Each tab has its own deep doc

The chart catalogue, formula and reading guide for every widget is in [`docs/pages/`](../pages/). Pick the page matching the tab you're on.
