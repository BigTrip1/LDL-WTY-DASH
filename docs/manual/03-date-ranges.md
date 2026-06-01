# 3. Date ranges

The **date strip** above the filter bar controls the date window every chart and table is scoped to. It has three parts:

- **From / To** calendar inputs.
- A row of **quick-pick chips**: `All · Last 30d · Last 90d · YTD · 2024 · 2025 · Pre-regime · Post-regime`.
- Buttons for **Presets · Export CSV · Recompute** (on the right).

## Which date field does the filter use?

By default the date filter applies to **`vettedDate`** — the date the claim was reviewed by the warranty team. Most metrics rely on `vettedDate` because:

- It's populated on **~92 %** of rows (vs ~16 % for `claimDate` and `failDate`).
- It's the canonical "this claim is in the data" timestamp.

To filter by `buildDate`, `claimDate` or `failDate` instead, add `dateField=buildDate` (etc.) to the URL. The full Filter type lives in [`frontend/src/lib/api.ts`](../../frontend/src/lib/api.ts) for reference.

## Quick-pick chips

| Chip | Effect |
|---|---|
| **All** | Clears `from` / `to`. Every claim in the database. |
| **Last 30d / 90d** | Trailing 30 or 90 days from today (or from the latest vetted date in the data, whichever is older). |
| **YTD** | Jan 1 of this calendar year through today. |
| **2024 / 2025** | A specific calendar year. |
| **Pre-regime** | All claims vetted before 2025-01-01 (the new vetting manager took over that day). |
| **Post-regime** | All claims vetted on or after 2025-01-01. |

Pre-regime and Post-regime apply the `regime` filter chip rather than `from / to` — that's why their behaviour is the same regardless of which date field you're using.

## The Jan-2025 regime line

Every chart that shows a monthly time axis includes a **dashed yellow vertical line** at 2025-01-01. This is the date the new vetting manager started; the team's outcome bias visibly shifts at that point. The [Vetting & regime](../pages/03-vetting-and-regime.md) tab quantifies the impact (Accept 90 % → 80 %, Reject ~3 % → ~10 %, Z-Code ~2 % → ~4 %).

## Coverage caveats

- `claimDate` and `failDate` are only populated on ~16 % of rows. Charts that depend on these fields (time-to-vet, fail-to-claim lag) operate on the subset that has them.
- The cleaning pipeline drops impossible values: dates that can't be parsed, hours > 20,000 or < 0, negative `buildToFailDays`. These are surfaced as data-quality counters in the [Data quality tab](../pages/10-data-quality.md).

## Saving a date range as a preset

1. Set the date range you want.
2. Click **Presets** (top-right of the date strip).
3. Type a name and click **Save**.
4. Recall any time by clicking the preset name.

Presets live in your browser's `localStorage` — they're per-machine, not shared.
