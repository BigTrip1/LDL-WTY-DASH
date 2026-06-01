# 8. Common workflows

Step-by-step recipes for the most common questions the warranty team brings to the dashboard.

## "What's worth investigating today?"

1. Open the dashboard. Read the 6 **headline cards** in the Overview tab.
2. Scroll to the **Top movers** table (last 90d vs prior 90d). Anything with a large positive delta is rising.
3. Glance at the **symptom sparklines** for trends across the top 8 NLP tags. Multiple sparklines rising at once = something broad happening.
4. Check the **DOA-by-build-cohort** area chart. A sudden red spike on a recent build month is a batch incident candidate.

If something jumps out, jump to the matching tab to drill in (e.g. an "Area" mover → click Outcome drivers tab with `dimension=Area`).

## "Which models have the worst DOA rates?"

1. Go to **Reliability** tab.
2. Scroll to the **DOA league table (all models)**.
3. Models are pre-sorted by DOA rate descending. The red-badge values (>40 %) are the priority list.
4. Cross-check the **Claims** column — a 100 % DOA rate on 5 claims isn't statistically meaningful.

## "I want to look at one specific model"

1. Click the **Model** chip in the filter bar.
2. Tick the model family you want.
3. Every chart and table on every tab is now narrowed to that model.

## "Find machines worth a buy-back / site-visit conversation"

1. Go to **People & places** tab.
2. The four stat tiles tell you how widespread recidivism is.
3. The **Repeat-offender machines** table lists serials with ≥5 claims. The "Likely repeat" column flags machines that have ≥3 claims AND ≥180 days since their last claim — strong candidates.
4. Click any serial number to open the claim modal — it includes a panel of every other claim against that serial.

## "Which supplier is causing the most rejected claims?"

1. Go to **Supply & geography** tab.
2. Read the **Supplier reject-rate league** (sorted by reject rate descending).
3. Click any supplier row to filter the entire dashboard to that supplier — every tab now shows their footprint.
4. Switch to **Outcome drivers** tab, pick `Supplier` from the dimension dropdown — you'll see exactly how they compare against the baseline.

## "What did the Jan-2025 regime change actually do?"

1. Go to **Vetting & regime** tab.
2. The top table shows pre vs post Jan-2025 with delta percentage points. Read across the rows: Accept fell, Reject rose, Z-Code rose, etc.
3. The **monthly outcome mix** stacked bars (middle) show the time-series — the regime line cuts the chart at Jan-2025.
4. The **per-vetter** chart at the bottom lets you click any vetter row in the scorecard to add their line to the trend.

## "Triage today's pending vets"

1. Make sure the date strip is set to **All** (or a recent window).
2. Apply the filter chip **Outcome** with nothing selected, OR use the **Pending Vets** KPI tile as a sense check.
3. Go to **Data quality & drill-down** tab.
4. The claims grid shows the latest claims first. Filter by `outcome = ''` (or open the dropdown and tick the "Pending" placeholder) and you'll see the queue.

## "What symptoms are customers complaining about most?"

1. Go to **Description NLP** tab.
2. Read the **tag cloud** and the **tag frequency** bar chart — the top tags are the dominant symptoms.
3. Click any tag in the cloud to add it to the **Tag trend** chart and see its monthly pattern.
4. Use the **free-text claim search** to read raw narratives. Search for specific phrases (e.g. `"boom shimming"`, `valve block`, `travel site`).

## "Generate a PDF report for the Monday status meeting"

1. Click **Report** in the top nav.
2. Pick `Last 90d` (or whatever range matters).
3. Click **Generate report**.
4. When loading finishes, click **Print / Save as PDF** and save to your shared folder.

To automate this, schedule [`scripts/weekly.bat`](../../scripts/weekly.bat) (see [Section 6](06-pdf-report)).

## "Find a specific claim"

- Type the claim number (or part of it) into the **search box** on the right of the filter bar.
- OR go to **Data quality & drill-down** and scroll the grid.
- OR open the claim by serial number — search the description first, click the matching row, then use the "Other claims on serial X" panel in the modal.

## "Investigate a batch incident on a specific build month"

1. Go to **Build-date** tab.
2. Read the **Build-cohort + DOA** chart — find the bad month.
3. Look at the heatmap below — the row(s) and column(s) with the brightest cells (or a red anomaly dot) tell you which production area was hit.
4. Click the column header for that build-month — a drill panel opens below with top parts, top tags, top dealers and top countries for that cohort.
