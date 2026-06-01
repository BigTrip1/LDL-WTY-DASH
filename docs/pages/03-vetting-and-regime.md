# Page 3 - Vetting & regime

## Purpose
Quantify the impact of the January 2025 vetting-manager change, surface how individual vetters behave, and show the monthly outcome mix so policy drift is visible at a glance.

Primary user: warranty manager looking to calibrate vetters and report on the regime impact to the leadership team.

## Layout map

```
+-----------------------------------------------------------------------------+
| Sticky header: KPI tiles + date strip + filter bar + tabs                  |
+-----------------------------------------------------------------------------+
| Row 1 (full-width)                                                          |
|   Regime impact - pre vs post Jan 2025                                      |
|   Outcome | Pre n | Pre % | Post n | Post % | Delta pp                     |
+-----------------------------------------------------------------------------+
| Row 2 (full-width)                                                          |
|   Monthly outcome mix (stacked bar, 7 outcomes, regime reference line)      |
+-----------------------------------------------------------------------------+
| Row 3 (full-width)                                                          |
|   Vetter scorecard with checkbox column + "N of M selected" + All/Top 6/   |
|   Clear buttons. Each row: vetter / vetted / reject / z-code / avg days /  |
|   first->last / accept. Selected rows: yellow background + line-color      |
|   left stripe + bold yellow vetter name + checkmark.                       |
+-----------------------------------------------------------------------------+
| Row 4 (full-width)                                                          |
|   Per-vetter accept rate over time - N selected (line chart)                |
|   One line per selected vetter; colours match the row stripe above.        |
|   Empty state: "Click rows in scorecard above" message.                    |
+-----------------------------------------------------------------------------+
```

## Widget catalogue

### Regime impact table
- **Source**: `/api/analytics/regime-impact`.
- **Formula**: splits the dataset on `vettedDate < 2025-01-01` (pre) and `vettedDate >= 2025-01-01` (post). For each outcome, computes `n` and `n / regime_total` for both, then `deltaPp = (post% - pre%) * 100`.
- **Reading**: deltaPp in red = the outcome got more frequent post-regime; in green = less frequent. The headline finding is Accept -9.7 pp / Reject +6.8 pp / Z-Code +1.5 pp.

### Monthly outcome mix
- **Source**: `/api/analytics/outcome-monthly`.
- **Formula**: `count(*) GROUP BY (month(vettedDate), claimOutcome)` -> pivoted client-side into a stacked-bar shape with one series per outcome.
- **Reading**: each bar = one month, stacked by outcome colour. The Jan-2025 reference line marks the regime change. Watch for:
  - the green (Accept) segment shrinking after the line
  - the red (Reject) and yellow (Z Code) segments growing
  - new colours appearing post-regime (Raise on Supplier only exists after Jan 2025)

### Vetter scorecard
- **Source**: `/api/analytics/vetter-scorecard`.
- **Formula**: per vetter, `count(*)` total + `count(outcome) / count(*)` for each outcome + `avg(vettedDate - claimDate)` in days + `min/max(vettedDate)` for the date range.
- **Reading**:
  - **Vetted** column = total claims that vetter has touched
  - **Accept rate badge** (last column) red = <70 %, amber = 70-85 %, green = >85 %
  - **Avg days to vet** badge red = >10 days, amber = 5-10, green = <=5
  - **First -> Last** shows when they started and last vetted - tail-off may mean they moved off line duty (e.g. Louise Wheeldon)
- **Drill-down**: click any row to toggle that vetter into/out of the per-vetter trend chart below. Selected rows have a coloured left-edge stripe (matching the chart line), a yellow background, a bold yellow vetter name, and a yellow checkmark.
- **Header controls**:
  - `N of M selected` indicator
  - `All` button -> selects every vetter
  - `Top 6` button -> resets to the 6 highest-volume vetters
  - `Clear` button -> unselects everything (chart shows empty state)

### Per-vetter accept rate over time
- **Source**: `/api/analytics/vetter-monthly`.
- **Formula**: `count(Accept) / count(*) GROUP BY (vettedBy, month(vettedDate))`. Client filters the result to only the selected vetters.
- **Reading**: one line per selected vetter, Y-axis 0-100 %. Regime reference line at Jan-2025. Useful for spotting individual drift - for example Kavan Sandhu starts at 100 % accept in Jan 2025 and drops to ~60 % by Sep 2025.
- **Empty state**: when no vetters are selected, the chart shows "No vetters selected" with a hint to use the Top 6 button.

## Cross-filter behaviour
- Global filters narrow every query on this page.
- Scorecard row click is a **local toggle** (doesn't change global filter).
- To filter the whole dashboard to one vetter, use the Vetter chip in the global filter bar.

## Common interpretations
1. **Reject column climbs from Jan 2025 onwards** = expected; reflects the new manager's stricter line.
2. **A vetter's Accept rate sits well below the team median** = either tougher case mix (use Outcome Drivers to see if they vet a specific area) or a personal calibration drift; raise with the team.
3. **Avg days to vet > 10** = backlog forming; check Operations -> Time to vet for monthly trend.
4. **A vetter goes from 100 % to 60 % accept in 8 months** (Kavan Sandhu's pattern) = either they got onboarded and started recognising rejectable claims, or they're being asked to absorb the harder cases.
5. **"Raise on Supplier" only appears post-regime** = a new policy category introduced by the new manager.

## Known limitations
- Avg days to vet excludes rows where either `claimDate` or `vettedDate` is null (~84 % of rows lack a claimDate). The average is on the ~16 % that have both.
- Z-Code is **not** counted as an accept in the True Accept Rate - the team's KPI rule.
- The chart re-fetches on filter change, not on selection toggle (toggling is client-side filtering of cached data) - this is the right behaviour but it means the loading spinner only shows when the filter itself changes.
