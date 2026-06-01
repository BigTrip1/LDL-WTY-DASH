# Page 8 - Operations

## Purpose
The "warranty operations" view: how the production team's detection points are performing, how the vetting backlog looks, which departments own the work, where goodwill payments concentrate, and what seasonality the claims data shows.

Primary user: warranty operations manager / production quality lead.

## Layout map

```
+-----------------------------------------------------------------------------+
| Sticky header                                                               |
+-----------------------------------------------------------------------------+
| Row 1 (3-col 1:2)                                                           |
|   PDI/UV escape KPI    |  Top PDI escape parts (table, top 25)              |
+-----------------------------------------------------------------------------+
| Row 2 (full-width)                                                          |
|   'Cannot Detect' share over time (bars + share line + regime line)         |
+-----------------------------------------------------------------------------+
| Row 3 (3-col 2:1)                                                           |
|   Time to vet - monthly avg     |  Time to vet - by vetter (table)          |
+-----------------------------------------------------------------------------+
| Row 4 (3-col 2:1)                                                           |
|   ASD ownership split (table)   |  Z-Code drivers (top parts + areas)       |
+-----------------------------------------------------------------------------+
| Row 5 (3-col 1:2)                                                           |
|   Day-of-week vetting activity  |  Month-of-year activity (seasonality)     |
+-----------------------------------------------------------------------------+
| Row 6 (full-width)                                                          |
|   Theme integrity audit (samples table; row click -> claim modal)           |
+-----------------------------------------------------------------------------+
```

## Widget catalogue

### PDI / UV escape rate (KPI tile)
- **Source**: `/api/analytics/pdi-escape`.
- **Formula**: `count(*) WHERE detection IN ('Ops Pdi', 'Operations PDI', 'UV', 'Uv1', 'Uv2', 'Booms SIP', 'Cycle Test') / count(*)`.
- **Reading**: % of claims that the source system tagged with a PDI/UV detection point - i.e. **the issue should have been caught in production**. Currently sits at ~45 % - large opportunity for upstream improvement.

### Top PDI escape parts (table)
- Same endpoint, top 25 parts whose claims have PDI-style detection.
- Useful for prioritising which PDI check needs tightening.

### "Cannot Detect" share over time
- **Source**: `/api/analytics/cannot-detect-trend`.
- **Formula**: per month, `count(detection='Cannot Detect')` + `share = that / count(*)`.
- **Reading**: yellow bars = absolute count, red line = share of vetted. Jan-2025 regime line overlaid. Major finding: the share went from <1 % pre-2025 to 15-23 % from Feb 2025 - the new vetting regime uses "Cannot Detect" much more frequently.

### Time to vet - monthly average
- **Source**: `/api/analytics/time-to-vet`.
- **Formula**: per month, `avg(vettedDate - claimDate)` in days, only rows with both dates populated.
- **Reading**: area chart of average days from claim to vet. Spikes = backlog; flat = consistent throughput.

### Time to vet - by vetter (table)
- Same endpoint, per-vetter breakdown of average days to vet + claim count.
- Badge red > 10 days, amber 5-10, green <= 5.

### ASD ownership split (table)
- **Source**: `/api/analytics/by-asd`.
- **Formula**: per ASD bucket (Assembly / Supplier Internal / Supplier External / Design / Unknown), claim count + outcome rates.
- **Reading**: the **Unknown** bucket reject rate is the most telling number - typically 35-40 %, meaning the single biggest reject driver is "vetter couldn't categorise the claim".

### Z-Code drivers (top parts + top areas)
- **Source**: `/api/analytics/zcode-drivers`.
- **Formula**: among Z-Code claims, top failed parts and top areas.
- **Reading**: where goodwill payments concentrate. Useful for budget conversations and supplier negotiations.

### Day-of-week vetting activity
- **Source**: `/api/analytics/seasonality` -> `dayOfWeek`.
- **Formula**: `count(*) GROUP BY dayOfWeek(vettedDate)`.
- **Reading**: confirms vetters work mostly Mon-Wed (vetted-date pattern), tail off Thu-Fri, near-zero on weekends.

### Month-of-year activity
- Same endpoint -> `monthOfYear`, aggregated across years.
- **Reading**: reveals seasonality. Look for peaks in agricultural / construction-season months.

### Theme integrity audit
- **Source**: `/api/analytics/theme-integrity`.
- **Formula**: counts + 25 sample rows where `theme` field equals an outcome value like "Z Code", "Z Coded", "Z-Code", "Accept", "Reject" - i.e. the theme field was hijacked for a decision.
- **Reading**: data quality finding. ~120 rows have this issue. Click any sample row to open the claim modal and see the full context.
- **Drill-down**: row click -> claim modal.

## Cross-filter behaviour
- Global filter narrows every query on this page.
- Theme integrity row click opens the claim modal (not a filter).
- ASD table rows are not clickable today (no `asd` filter exists). Adding one would let users say "show only Assembly-owned claims".

## Common interpretations
1. **PDI escape rate > 30 %** = production process gaps. Cross-reference top escape parts with the Top failed parts widget on Overview.
2. **Cannot Detect share jumps 5x post-regime** = new vetting policy is over-using the category. Consider sub-categories or a more disciplined definition.
3. **Time to vet rising trend with reject rate also rising** = backlog forming because the new manager is reviewing claims more thoroughly. Not necessarily bad - quality vs throughput trade-off.
4. **A vetter with 25+ days avg in the by-vetter table** = either part-time / left the team, or holding a large pile of complex cases. Worth a 1-on-1.
5. **ASD `Unknown` accept rate < 25 %** = the bucket is doing real triage work - it's where things go when they're going to be rejected.
6. **Day-of-week chart shows weekend activity** = scheduled overtime or someone catching up; cross-check the dates.
7. **Theme integrity > 0 samples** = upstream data discipline issue; flag to whoever maintains the source export.

## Known limitations
- Time-to-vet only includes rows with both `claimDate` and `vettedDate` populated - ~16 % of rows. The metric is biased toward recent data where both dates are mandatory.
- The "Cannot Detect" definition is just literal text matching on `detection` - if the source system renames the category, the trend line will drop to zero overnight without flagging the rename.
- ASD rows aren't click-to-filter today (no `asd` filter in the global Filters type - improvement candidate).
- The PDI escape definition is a fixed regex list; if PDI categories evolve upstream, update [backend/src/routes/analytics.ts](../../backend/src/routes/analytics.ts) `/pdi-escape` route.
