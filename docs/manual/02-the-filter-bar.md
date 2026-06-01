# 2. The filter bar

The filter bar sits just under the date strip and contains 12 chips. Picking values from any chip narrows **every chart and table** on the dashboard at the same time.

## The chips

| Chip | What it filters by | Typical use |
|---|---|---|
| **Model** | `machineModel` family | Compare one model family against another |
| **Country** | Destination market | Spot regional patterns or vetter bias |
| **Supplier** | `partSupplier` of failed part | Investigate a specific supplier's quality |
| **Area** | Production area the vetter assigned | Drill into a single department's claims |
| **tPeriod** | Warranty bucket (DOA / T000-T006) | Compare early-life vs late-life claims |
| **Outcome** | Vetter decision | Inspect all rejected or all z-coded claims |
| **Regime** | `pre-2025` / `post-2025` / `unvetted` | Slice by the Jan-2025 inflection |
| **Vetter** | Who vetted the claim | Calibrate individual vetters |
| **Tag** | NLP description tag | Find all claims about oil leaks, vibration, etc. |
| **Dealer** | The dealer who submitted the claim | Dealer-level review |
| **Theme** | Vetter's fault-theme label | Look at one theme across many models |
| **Customer** | End customer (top 200 only) | Investigate a specific rental fleet |

Each chip's **(i) icon** explains the field in plain English.

## How to use a chip

1. Click any chip to open the popover.
2. Search the list using the text input at the top (helpful for the long lists like Supplier or Dealer).
3. Tick one or more values. The chip badge shows how many are selected.
4. The page re-fetches data automatically — every chart, table, and KPI tile narrows.

## Clearing filters

- **Per chip**: open the chip popover and click **clear**.
- **All at once**: click the **Reset** button at the end of the bar. The badge next to it tells you how many filters are currently active.

## Sharing a filtered view

The full filter state lives in the URL. To share a view:

1. Apply the filters you want.
2. Copy the browser URL.
3. Paste it to a colleague — they'll see the dashboard with the same filters applied.

The URL also captures the active tab (e.g. `?tab=regime&model=540V140&supplier=GATES HYDRAULICS (EUR)`).

## Date filters live in the strip above the chips

The **date strip** is a separate row above the filter bar with two calendar inputs (`From / To`) plus quick-pick chips (`All / Last 30d / 90d / YTD / 2024 / 2025 / Pre-regime / Post-regime`). See [Section 3 — Date ranges](03-date-ranges).

## Tips

- Hold the **shift** key (in the dashboard data-quality grid) to select multiple consecutive rows for inspection.
- The **Tag** chip is the only one that searches inside the description; everything else is structured data.
- Filters from clicking a chart bar **always add to** the current filter — they do not replace it. To start fresh, click Reset first.
