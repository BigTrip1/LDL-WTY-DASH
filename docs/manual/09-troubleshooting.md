# 9. Troubleshooting & FAQ

## "A chart looks empty"

Common causes, in order of likelihood:

1. **The current filter eliminates all the data.** Look at the **Reset** badge — it shows how many filters are active. Click Reset to clear them.
2. **Date range too narrow.** Click the **All** quick-pick chip in the date strip.
3. **The card needs both `claimDate` and `vettedDate`** (e.g. Time-to-vet). Only ~16 % of rows have both — the chart operates on that subset, which can be very small with tight filters.
4. **The card needs a specific outcome** (e.g. Z-Code drivers). Filtering out that outcome will empty the chart.
5. **You picked a tab before data loaded.** Switch away and back; the cached query will resolve.
6. **Real outage.** Check that the backend is up at `/api/health`.

## "The numbers don't match what I had yesterday"

Possible explanations:

- The dataset was updated (someone re-uploaded). Check the Admin tab's **Upload history** for the latest ingest timestamp.
- A filter is silently active from a saved preset or shared URL. Click **Reset**.
- You're on a different `dateField`. Check the URL for `dateField=...`. Default is `vettedDate`.
- The browser is rendering a cached page. Hard-refresh (Ctrl + F5).

## "Click handler doesn't seem to do anything"

- **Vetter scorecard rows**: clicking adds/removes the vetter from the per-vetter chart below. Look for the yellow background, checkmark and coloured left-edge stripe on the selected row.
- **Chart bars**: a click adds the value to the global filter. Watch the filter chip badges at the top — the count next to **Reset** will increment.
- **Live activity rows** (Overview) or **Data quality grid rows** open a claim modal — it slides in from the right. If you don't see it, the click might have hit a non-clickable area; click the row's left-side dot or the claim number explicitly.

## "I uploaded a CSV but nothing changed"

- Look at the **upload result card**: if `skipped (dupes)` equals `received`, the file was identical to what's already in the database (by `claimNumber`).
- The dashboard fetches data per query — switch tabs once to force a re-fetch, or refresh the page.

## "The PDF report says 'loading 14/25…' and never finishes"

- The 25 queries fire in parallel. One slow query will hold up the Print button.
- Check the backend terminal for errors.
- Try a narrower date range to reduce query workload.

## "MongoDB connection error on startup"

- Make sure `mongod` is running on `:27017`. The Windows service `MongoDB` typically starts at boot.
- If you use the project's own dbpath (`mongo-data/`), make sure no other `mongod` is bound to `:27017` (run `netstat -ano | findstr :27017` to check).

## "The headless screenshot tool shows blank charts"

That's a known artifact of `Page.captureScreenshot({captureBeyondViewport: true})` after `setDeviceMetricsOverride` — the ResponsiveContainer doesn't reflow fast enough. The **live browser renders them correctly**. Use the DOM inspector (`.audit/check-all.mjs`) to confirm bar counts if you need a programmatic check.

## "Why is `vettedDate` used as the default date field?"

It's populated on ~92 % of rows. `claimDate` and `failDate` are only on ~16 %. Most charts would have gaping holes if they used those by default. The cards that genuinely need `claimDate`/`failDate` mention this in their (i) info tooltip.

## "Why is Z-Code not counted as an accept?"

Per the warranty team's KPI rule: **Z-Code = goodwill payment**. The claim was paid for customer-relationship reasons but the team explicitly did not accept it as a warranty case. The "True Accept Rate" excludes Z-Code from the numerator so it reflects genuine warranty-quality. This is documented in every relevant info tooltip.

## "Why are some chart bars missing on the Build heatmap?"

The heatmap shows the **top 15 areas by total claims**. Smaller areas with localised batch issues won't appear. Apply the **Area** filter chip if you need to scope to a specific small area.

## "Where do I report a bug?"

Open the backend terminal log first — most issues show up there. If it's a real bug, capture:

1. The URL you were on (it captures the active filters).
2. The browser console (F12 → Console tab) for any JS errors.
3. The backend terminal log for any 500 errors.

## "Where can I add a new symptom tag?"

Edit `TAG_RULES` in [`backend/src/services/nlp.ts`](../../backend/src/services/nlp.ts). Add a `[tagName, /regex/i]` entry. After saving, click **Recompute** in the dashboard top strip to re-tag existing rows.

## "Does the dashboard talk to any internet service?"

No. The audit script `scripts/audit-no-ai.bat` re-confirms zero AI / LLM references in the source. The full evidence is in [`docs/AI-FREE-OPERATION.md`](../AI-FREE-OPERATION.md). The only network connection at runtime is `localhost:27017` (Mongo).
