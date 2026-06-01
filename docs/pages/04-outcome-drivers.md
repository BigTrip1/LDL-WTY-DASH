# Page 4 - Outcome drivers

## Purpose
For any chosen dimension (Area / Theme / Model / Supplier / tPeriod / Hours bucket / Country / Dealer / Detection / Description tag), surface the values that disproportionately drive Rejects, Accepts, or Z-codes - so the warranty team knows where to point an investigation.

Primary user: warranty quality engineer asking "which suppliers / models / areas account for the most rejected claims?"

## Layout map

```
+-----------------------------------------------------------------------------+
| Sticky header: KPI tiles + date strip + filter bar + tabs                  |
+-----------------------------------------------------------------------------+
| Toolbar: Dimension dropdown + "min 30 claims" hint                          |
+-----------------------------------------------------------------------------+
| Row 1 (3-col)                                                               |
|   Most-rejected | Most-accepted | Most Z-coded                              |
|   Each table: dimension value / n / rate badge                              |
|   Rows are click-to-filter (when dimension maps to a global filter key)     |
+-----------------------------------------------------------------------------+
| Row 2 (full-width)                                                          |
|   Outcome mix - top 15 dimension values by volume (stacked horizontal bars) |
|   Each bar shows Accept / Reject / Z Code / More Info / Raise on Supplier   |
+-----------------------------------------------------------------------------+
```

## Widget catalogue

### Dimension selector
- Dropdown with: Area, Theme, Model, Supplier, T-period, Hours bucket, Country, Dealer, Detection, Description tag.
- Changing it re-fires `/api/analytics/outcome-drivers?dimension=X&minN=30` and redraws all four widgets.

### Most-rejected / Most-accepted / Most Z-coded tables
- **Source**: `/api/analytics/outcome-drivers?dimension=X&minN=30` returns rows with `acceptRate`, `rejectRate`, `zcodeRate` plus the chi-square-style deviations vs the baseline.
- **Filter**: only values with at least 30 claims are returned, so single anomalies don't dominate.
- **Reading**:
  - Most-rejected: sorted descending by rejectRate. Top of the list = the values most over-represented in Reject outcomes.
  - Most-accepted: sorted descending by acceptRate. Top = the safest values (often catch-all categories).
  - Most Z-coded: sorted descending by zcodeRate. Top = the values where goodwill is most often applied.
- **Drill-down**: row click adds the value to the global filter, when the dimension has a corresponding filter key:
  - Area -> `area`
  - Theme -> `theme`
  - Model -> `model`
  - Supplier -> `supplier`
  - T-period -> `tPeriod`
  - Hours bucket -> `hoursBucket`
  - Country -> `country`
  - Dealer -> `dealer`
  - Tag -> `tags`
  - Detection currently has no matching filter key (improvement candidate).

### Outcome mix - top 15 values by volume (horizontal stacked bars)
- **Source**: same endpoint as the tables, but the top 15 by `n` (not by rate).
- **Formula**: each bar = `Accept | Reject | Z Code | More Info | Raise on Supplier` counts stacked.
- **Reading**: lets you compare the absolute outcome mix between high-volume values. A long red segment on a high-volume bar = real-world impact, not just a high rate on a small sample.

## Cross-filter behaviour
- Global filter bar narrows the universe before grouping. E.g. setting `model = 540V140` will restrict every dimension's groups to that model only.
- Row clicks in the three tables add to the global filter (the rest of the dashboard updates).
- Driver tables show `Click any row to add to filter` in the card description when the dimension is mappable.

## Common interpretations
1. **`Unknown` dimension value at the top of Most-rejected with 36 %+ reject rate** = the "I couldn't categorise this claim" bucket is the biggest reject driver. The vetter couldn't place it, so they default to Reject. Push for categorisation discipline upstream.
2. **A supplier with high reject rate AND high z-code rate** = the warranty team can't decide whether to accept; quality concerns plus customer-relationship pressure. Supplier 8D candidate.
3. **A Tag with high accept rate** (e.g. `loose`) = these claims are routinely accepted - they're well-understood failure modes covered by warranty.
4. **A Detection value at the top of Most-rejected** = claims that came through a detection point that should have stopped them. PDI escape rate page has more on this.
5. **Hours bucket >=5000 with high Reject rate** = end-of-warranty cliff - machines failing late in life don't qualify, rejected by policy.

## Known limitations
- 30-claim minimum hides niche-but-real issues. Lower the threshold by tweaking `minN` if needed (improvement candidate: expose this as a UI slider).
- Detection dimension has no matching global filter key, so its row clicks are no-ops (UI doesn't show the click-to-filter hint when `dim=detection`).
- The bottom stacked-bar chart shows only the top 15 by volume - high-rate low-volume values won't appear there but will still appear in the rate-sorted tables above.
