# Page 10 - Data quality & drill-down

## Purpose
Quantify the data quality of the loaded dataset (so users know what they can trust), and provide the universal claims grid - the lowest level of detail in the dashboard.

Primary user: anyone investigating a specific claim, plus data-quality engineers chasing upstream fixes.

## Layout map

```
+-----------------------------------------------------------------------------+
| Sticky header                                                               |
+-----------------------------------------------------------------------------+
| Row 1 (4-col)                                                               |
|   Total / Neg build->fail / Missing fail date / Missing claim date         |
|   Unvetted (Pending) / Area Unknown / Theme Unknown / Hours null            |
|   Description truncated (=600 chars) / Theme mislabelled as outcome         |
+-----------------------------------------------------------------------------+
| Row 2 (full-width)                                                          |
|   Claims drill-down grid                                                    |
|   25 columns visible, server-paginated 25 rows per page                     |
|   Row click -> open claim detail modal                                      |
|   Pagination at the bottom shows N of M pages                               |
+-----------------------------------------------------------------------------+
```

## Widget catalogue

### Anomaly tiles (10)
- **Source**: `/api/analytics/anomalies`.
- **Formula**: each tile is a `count(*) WHERE condition` against the current filter.

| Tile | Counts |
|---|---|
| Total claims (filtered) | All matching rows |
| Negative build->fail days | `buildToFailDays < 0` - data-entry errors |
| Missing fail date | `failDate is null` (~84 % of rows) |
| Missing claim date | `claimDate is null` |
| Unvetted (Pending) | `claimOutcome is null` |
| Area = Unknown | normalised to 'Unknown' on ingest where source was empty |
| Theme = Unknown | same idea for theme |
| Hours null / placeholder | originally `#` or out-of-range |
| Description truncated (=600 chars) | matches the source-system cap |
| Theme mislabelled as outcome | `theme IN ('Z Code', 'Z Coded', 'Z-Code', 'Accept', 'Reject')` |

### Claims drill-down grid
- **Source**: `/api/analytics/.../api/claims` -> `{page, pageSize, total, rows}`.
- **Pagination**: 25 rows per page, server-paginated. Pagination footer shows current page / total + Prev/Next buttons.
- **Sort**: server-side `vettedDate desc` by default. Other sorts can be passed via query string but UI doesn't expose column-click sorting yet (improvement candidate).
- **Search**: the description text-search box in the global filter bar narrows results via Mongo text index.
- **Visible columns**: Claim # / Vetted / Build / Model / Area / tPeriod / Outcome / Hours / Vetter / Country / Description (truncated).
- **Drill-down**: row click -> opens the claim detail modal with full description, all tags, vetter notes, and a "Other claims on serial X" panel.

## Cross-filter behaviour
- Global filter narrows the grid.
- Use the date strip + filter chips + free-text search to drill to any subset.
- Click any cell in the grid to read full context - the modal is the single source of truth at the per-claim level.

## Common interpretations
1. **Negative build->fail count > 0** = data-entry errors (claim filed before the machine was built, which is impossible). Use the grid filter `dateField=failDate` + drill in to see them.
2. **Missing fail date > 80 % of total** = expected; the source system makes this field optional. The dashboard falls back to `vettedDate` for timelines.
3. **Unvetted (Pending) climbing** = vetter backlog forming. Cross-check Operations -> Time to vet.
4. **Description truncated > 0** = some claims hit the source-system's 600-char cap and their bigram counts are partial.
5. **Theme mislabelled > 0** = vetters typed the outcome into the theme field. Upstream training opportunity.

## Known limitations
- The grid only shows 25 rows per page; bulk export should use the CSV download from the top strip (or directly `GET /api/export/csv?<filters>`).
- Column-click sorting is not yet implemented (improvement candidate).
- The text-search field in the filter bar uses Mongo's text-index `$meta:"textScore"` ordering by default - it doesn't show the score in the grid (improvement candidate).
- Missing-date counts cover the full claim set in the current filter - changing the date field in the global filter does NOT affect these counts (they're absolute).
