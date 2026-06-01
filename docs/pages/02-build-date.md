# Page 2 - Build-date trends

## Purpose
Hunt for batch-quality incidents: spot machine-build months that produced disproportionately bad cohorts, and surface which production area was responsible.

Primary user: production quality + supplier quality engineers chasing root cause of a DOA spike.

## Layout map

```
+-----------------------------------------------------------------------------+
| Sticky header: KPI tiles + date strip + filter bar + tabs                  |
+-----------------------------------------------------------------------------+
| Row 1 (full-width)                                                          |
|   Build-cohort claim volume + DOA rate (area + line)                        |
|   With "Mature cohorts only (>90 days ago)" toggle in the top-right header |
+-----------------------------------------------------------------------------+
| Row 2 (full-width)                                                          |
|   Build-month x Area heatmap (cross-tab)                                    |
|   Click any column header -> opens cohort drill panel below                 |
+-----------------------------------------------------------------------------+
| Row 3 (optional, full-width, appears after column click)                    |
|   Cohort drill: top parts / top areas / top tags / top dealers / countries |
+-----------------------------------------------------------------------------+
```

## Widget catalogue

### Build cohort · claim volume + T-period mix
- **Source**: `/api/analytics/build-cohort` -> `{date, n, doa, t1, t3, t6, doaRate, t1Rate, t3Rate, t6Rate, acceptRate, ...}`.
- **Lines**: DOA; T1 (T000+T001); T3 (T002+T003); T6 (T004–T006) as share of claims for machines built that month.
- **Formula**: bars = `count(*) GROUP BY month(buildDate)`. Line = `count(tPeriod='DOA') / count(*)` per month.
- **Reading**: bars show how many claims came from each build-month. Red line on the right axis is the DOA share of that cohort. A bar with both a high count AND high DOA% is the textbook "bad batch" signal.
- **Mature cohorts toggle**: enabled by default. Filters out build months younger than 90 days because their T-period tail hasn't had time to materialise. With the toggle off, recent months show inflated DOA % (e.g. Aug 2025: 62 %, Sep 2025: 73 %).
- **Reference line**: dashed JCB-yellow at 2025-01-01 marks the vetting regime change.

### Build-month x Area heatmap
- **Source**: `/api/analytics/build-area-heat` -> flat list of `{ym, area, n}` cells.
- **Formula**: `count(*) GROUP BY (month(buildDate), area)`.
- **Reading**: rows = production areas (top 15 by total claims, sorted by row total descending). Columns = build months in chronological order. Cell brightness is proportional to the count - darker = more claims. The brightest cells are batch incident candidates.
- **Drill-down**: **click any column header** (the rotated build-month label) -> opens the cohort drill card below the heatmap with the top parts, areas, tags, dealers, and countries for that single build month.

### Cohort drill (conditional)
- **Source**: `/api/analytics/cohort-drill?ym=YYYY-MM-01` (fired only after a column click).
- **Returns**: top 10 failed parts, top 10 areas, top 15 description tags, top 10 dealers, top 10 destination countries - all scoped to the chosen build-month.
- **Reading**: cross-reference top parts with the production area that was most affected. Most batch incidents point to a single supplier defect that shipped across many machines in that build window.
- **Dismiss**: "clear" button in the card header.

## Cross-filter behaviour
- Global filter bar narrows the cohort range, area mix and outcome distribution shown here.
- The heatmap column click is **local drill-down** (not a global filter). It doesn't add a filter; it opens the inline drill card.
- To filter the whole dashboard to a specific build month, use the date picker in the top strip and set the date field to `buildDate` (or apply via URL: `?from=2024-12-01&to=2024-12-31&dateField=buildDate`).

## Common interpretations
1. **Single bright cell on the heatmap** = one production area produced disproportionately bad claims for that build-month. Open the drill card and look at the top failed parts.
2. **Bright vertical column** = an entire month was bad across many areas. Likely a shared cause (component lot, calibration drift, vendor change).
3. **Bright horizontal row** = an area is consistently producing bad claims regardless of month. Process problem, not batch.
4. **Recent months on cohort line spike to 60-100 % DOA** = recency bias, not real. Toggle mature cohorts ON to hide.
5. **A row goes dark suddenly mid-timeline** = an area was renamed or closed. Cross-check Top movers on Overview for the recipient area.

## Known limitations
- `buildDate` is always populated in this dataset (zero nulls), so coverage is 100 % unlike `claimDate`/`failDate`.
- Build cohorts younger than ~90 days look worse than they are - use the toggle.
- The heatmap shows the **top 15 areas by total claims**, so smaller production areas with localised batch issues may not appear. Use the global Area filter to pin them.
