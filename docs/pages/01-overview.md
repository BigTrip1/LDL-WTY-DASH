# Page 1 - Overview

## Purpose
A command-centre landing page that surfaces the most important warranty signals at a single glance: where claim volume is heading, what changed after the Jan-2025 vetting regime, which parts and models are driving the most pain, and which symptoms are climbing.

Primary user: warranty manager opening the dashboard each morning to spot anything that needs attention today.

## Layout map

```
+-----------------------------------------------------------------------------+
| Hero strip: 8 KPI tiles (Total / Accept / Reject / Z-Code / DOA / Pending  |
| / Hours-to-fail / Active models) + sticky date strip + filter bar + tabs   |
+-----------------------------------------------------------------------------+
| Row 1 - Auto-headline cards (1-6 cards, severity-coloured)                  |
+-----------------------------------------------------------------------------+
| Row 2 (2-col 2:1) | Year-on-year clustered bars | Pre vs post regime donut  |
+-----------------------------------------------------------------------------+
| Row 3 (full)      | Monthly claim volume + 3-mo rolling line + regime line |
+-----------------------------------------------------------------------------+
| Row 4 (3-col 1:2) | Top movers table | Symptom sparkline strip (top 8 tags)|
+-----------------------------------------------------------------------------+
| Row 5 (3-col)     | Area Pareto      | Model league bars+DOA  | DOA cohort |
+-----------------------------------------------------------------------------+
| Row 6 (3-col)     | Live activity    | Top countries          | Top parts  |
+-----------------------------------------------------------------------------+
| Row 7 (CTA strip) | Quick links to other tabs                              |
+-----------------------------------------------------------------------------+
```

## Widget catalogue

### Hero KPI strip (8 tiles)

| Tile | Endpoint | Formula | Reading guide |
|---|---|---|---|
| Total claims | `/api/analytics/kpis` | `count(*)` over current filter | Headline volume number. |
| True Accept rate | same | `count(claimOutcome='Accept') / count(claimOutcome!=null)` | Z-Code is intentionally excluded - it's a goodwill payment, not an accept. |
| Reject rate | same | `count(claimOutcome='Reject') / count(claimOutcome!=null)` | Watch for sustained rises after Jan 2025. |
| Z-Code rate | same | `count(claimOutcome='Z Code') / count(claimOutcome!=null)` | Goodwill payments. Climbing post-regime suggests more borderline cases. |
| DOA rate | same | `count(tPeriod='DOA') / count(*)` | Dead-on-arrival rate. High = first-fit problem. |
| Pending vets | same | `count(claimOutcome=null)` | Backlog that has yet to be vetted. |
| Avg hours-to-fail | same | `avg(hours)` where `hours` is not null and <= 20000 | Soft MTBF proxy; values >20k hrs clipped at ingest. |
| Active models | same | `distinct(machineModel)` in filter | Number of distinct machine models represented. |

Every tile has an (i) info icon that shows the formula + source field, and a `range:` strip at the bottom showing the active date window.

### Headline cards (1-6 cards, auto-generated)

| Card | Triggered by | Severity |
|---|---|---|
| Vetting regime impact | always (when pre + post data exist) | warn (>5 pp drop in Accept) / info |
| Cannot-Detect surge | last 3 mo Cannot-Detect rate > 3x earliest 6 mo | bad |
| Top failed part | always | warn |
| Worst-DOA family | always (model with >=100 claims) | bad |
| Repeat-offender machines | always | info |
| PDI / UV escape rate | escape rate > 20% | warn |
| Dominant symptom | always | info |

Source: `/api/analytics/headlines`. Generated from hard-coded thresholds in [backend/src/routes/analytics.ts](../../backend/src/routes/analytics.ts) - **deterministic, no AI**.

### Year-on-year claim volume (bar chart)
- **Source**: `/api/analytics/yoy` -> `{year, month, n, accept, reject, zcode}` per `(year, month)`.
- **Formula**: `count(*) GROUP BY year(vettedDate), month(vettedDate)`.
- **Reading**: clustered bars - one colour per calendar year overlaid by month-of-year. Reveals seasonality and YoY drift in a single picture. Bars sized to absolute claim count.
- **Drill-down**: none (compare-only chart).

### Pre vs post Jan-2025 regime (donut + delta list)
- **Source**: `/api/analytics/regime-impact`.
- **Formula**: per outcome, `(count in regime) / (n in regime)`. `deltaPp = (post% - pre%) * 100`.
- **Reading**: two concentric donut KPIs (Pre acceptance / Post acceptance) plus a ranked delta list. Red = rose post regime; green = fell.
- **Drill-down**: none.

### Monthly claim volume with 3-month rolling average (bar + line, full width)
- **Source**: `/api/analytics/trend`.
- **Formula**: bars = `count(*) GROUP BY month(vettedDate)`. Line = centred 3-month rolling average of the bar series, computed in the browser.
- **Reading**: smooths month-to-month noise. The dashed yellow vertical line is the Jan-2025 regime change. Watch for the rolling line crossing the regime line at a steeper slope - that's where post-regime activity diverges.
- **Drill-down**: none.

### Top movers - last 90 days vs previous 90 (table)
- **Source**: `/api/analytics/movers?dim=area|tag|model|supplier&periodDays=90`.
- **Formula**: anchors to the latest `vettedDate` in the data. For each value of the chosen dimension, compares the count in `(maxVettedDate - 90d, maxVettedDate]` against `(maxVettedDate - 180d, maxVettedDate - 90d]`. Sorted by absolute delta.
- **Reading**: positive delta (red, up-arrow) = more claims recently = bad. Negative delta (green, down-arrow) = improvement. Click a row to add the value to the global filter and inspect that segment in detail.
- **Drill-down**: row click -> adds to filter.

### Symptom sparklines (8 tags)
- **Source**: `/api/analytics/tag-sparklines?topN=8`.
- **Formula**: monthly mentions of each top tag, plus a `momentum` percent = `(sum of last 3 months - sum of previous 3 months) / sum of previous 3 months`.
- **Reading**: each row = one symptom tag. Total mentions + last-3-month count + 120-px sparkline + momentum chip on the right. Strong positive momentum on multiple tags is a "broad failure mode rising" signal.
- **Drill-down**: row click -> adds tag to the `tags` filter.

### Failure-area Pareto (composed chart: bars + cumulative line)
- **Source**: `/api/analytics/by-area`.
- **Formula**: bars = `count(*) GROUP BY area`; cumulative line = running sum of bars / total.
- **Reading**: classic Pareto. Look for the inflection point on the line - usually the first 4-5 areas explain 60-80 % of claim volume.
- **Drill-down**: bar click -> adds area to filter.

### Model league - claims + DOA rate (composed chart)
- **Source**: `/api/analytics/by-model`.
- **Formula**: bars = claims per model; red line = `count(tPeriod='DOA') / count(*)` per model.
- **Reading**: high bar + high red line = priority. Click a bar to filter to that model.
- **Drill-down**: bar click -> adds model to filter.

### DOA rate by build cohort (area chart)
- **Source**: `/api/analytics/build-cohort`.
- **Formula**: `count(tPeriod='DOA') / count(*) GROUP BY month(buildDate)`.
- **Reading**: red area = DOA share per machine-build month. Recent months inflate (T-period tail hasn't materialised) - the Build-date tab has a "mature cohorts only" toggle to correct for this.
- **Drill-down**: none.

### Live activity - 14 most recent vetted claims
- **Source**: `/api/analytics/recent-activity?limit=14`.
- **Reading**: coloured dot = outcome category; description excerpt; inline tag pills. Click any row to open the claim drawer (full description + related serials).
- **Drill-down**: row click -> claim modal.

### Top countries - claims + accept rate (horizontal bars)
- **Source**: `/api/analytics/by-country`.
- **Reading**: top 12 countries by claim count.
- **Drill-down**: bar click -> adds country to filter.

### Top 15 failed parts (table)
- **Source**: `/api/analytics/top-parts?limit=15`.
- **Reading**: part code + supplier + claim count + accept-rate badge. Low accept rate (red) on a high-count part = supplier-quality investigation.
- **Drill-down**: row click currently scopes the search; consider wiring to filter (in [IMPROVEMENTS.md](../IMPROVEMENTS.md)).

## Cross-filter behaviour
- Global filters from the sticky filter bar narrow every endpoint on this page (and every other tab).
- Click-to-filter targets:
  - Area bars / Model bars / Country bars on this page
  - Tag sparklines (one row each)
  - Top-movers row -> adds to whichever dimension is selected
- Live activity row -> claim modal (not filter).

## Common interpretations
1. **Reject rate climbing while volume flat** = stricter vetting, not a quality drift. Confirm by checking the Vetting & regime tab's regime delta table.
2. **DOA rate spike on a build cohort** = batch-quality incident. Cross-reference build-month with the Build-date heatmap.
3. **Top movers shows Production +897** = a category was renamed; not a real spike. Cross-check Assembly Line which went to zero in the same window.
4. **Most symptom sparklines climbing simultaneously** = either total claim volume is rising or recent vetting is tagging more aggressively. Compare against the monthly volume chart.
5. **Top failed part has < 70 % accept rate** = supplier investigation; warranty team may already have a containment in progress.

## Known limitations
- `claimDate` and `failDate` are only populated on ~16 % of rows, so the Live Activity feed sometimes shows N/A dates. The vetted-date is the primary timeline.
- Recent build cohorts inflate DOA % because tail T-periods (T001-T006) haven't materialised yet. Toggle "mature cohorts only" on the Build-date tab for an apples-to-apples view.
- Top movers anchors to the latest `vettedDate` in the data, not today's date. If you're looking at a stale snapshot, "last 90 days" really means "last 90 days of data".
