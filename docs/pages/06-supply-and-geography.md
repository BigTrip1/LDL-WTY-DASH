# Page 6 - Supply & geography

## Purpose
Surface supplier quality problems and the geographic distribution of claims. Used by supplier-quality engineers and the regional warranty leads.

Primary user: supplier-quality engineer triaging which vendor to investigate next; regional warranty manager looking at market-level reject rates.

## Layout map (May-2026 redesign)

```
+-----------------------------------------------------------------------------+
| Hero map (full-width, ~520px tall)                                           |
|   Geographic claim map                                                       |
|   - Choropleth fill by claim count (Natural Earth 110m country borders)      |
|   - Bubble overlay sized by volume, coloured by accept rate                  |
|   - Click any country / bubble to filter                                     |
+-----------------------------------------------------------------------------+
| Regional rollup (5 tiles, full-width)                                        |
|   Europe | Americas | APAC | MEA | Other                                     |
|   Each tile: count + share% bar + accept-rate / reject-rate badges           |
+-----------------------------------------------------------------------------+
| Top-3 supplier podium (4/6 cols)  |  Supply concentration gauge (2/6 cols)   |
|   #1, #2, #3 by volume + accept   |  Semicircular gauge of top-5 share       |
|   rate badge; click to filter     |  with verdict text                       |
+-----------------------------------------------------------------------------+
| Supplier outcome mix (4/6 cols)   |  Supplier reject league (2/6 cols)       |
|   Stacked horizontal bars top-15  |  Table sorted by reject rate, click row  |
+-----------------------------------------------------------------------------+
| Top countries by claim volume (full-width bar chart)                          |
+-----------------------------------------------------------------------------+
```

## Widget catalogue

### Geographic claim map (hero, interactive)
- **Source**: `/api/analytics/by-country` + the static atlas in [frontend/src/lib/worldShapes.ts](../../frontend/src/lib/worldShapes.ts).
- **Formula**: choropleth fill = `sqrt(n / max)` ramp from dark grey -> JCB yellow per country; bubble colour = `acceptRate` thresholds (green >= 85%, amber 70-85%, red < 70%); bubble area proportional to claim count.
- **Reading**: the **fill** tells you total volume, the **bubble colour** tells you outcome bias, the **bubble size** reinforces the volume signal. A red bubble on top of a dim country = small problem locale. A green bubble on top of a bright yellow country = high-volume market with healthy accept rate.
- **Pan + zoom**: drag to pan, mouse-wheel to zoom (toward the cursor), double-click to reset. Toolbar at the top-right has explicit +/-/home buttons. The viewport defaults to 75°N..55°S so Antarctica isn't on screen; zoom in by ~3x to inspect a single country (the bubbles scale inversely to stay readable).
- **Drill-down**: click any bubble OR country to add `country` to the global filter.

### Regional rollup (NEW)
- **Source**: `/api/analytics/by-country`, aggregated client-side by the static `COUNTRY_REGION` map in [frontend/src/lib/countryCoords.ts](../../frontend/src/lib/countryCoords.ts).
- **Formula**: sum of `n`, `accept`, `reject`, `zcode` over countries in each region.
- **Reading**: 5 tiles - Europe / Americas / APAC / MEA / Other. The strip at the bottom of each tile is the share of total. Two badges: accept rate + reject rate. Tile border tints by accept rate.

### Top-3 supplier podium (NEW)
- **Source**: `/api/analytics/by-supplier?limit=3`.
- **Formula**: `count(*) GROUP BY partSupplier  ORDER BY count DESC LIMIT 3`.
- **Reading**: visual stack ranking - #2 left, #1 centre, #3 right. The accept-rate badge underneath each card flags supplier quality.
- **Drill-down**: click any podium card to add the supplier to the global filter.

### Supply concentration gauge (NEW)
- **Source**: `/api/analytics/by-supplier`.
- **Formula**: `sum(top5.n) / sum(all suppliers.n)`.
- **Reading**: semicircular gauge from 0 % to 100 %. Verdict label: `distributed` (< 40 %), `moderate` (40-60 %), `concentrated` (>= 60 %). Concentrated = a few suppliers drive most warranty volume; distributed = the issues are likely process-level rather than vendor-specific.

### Supplier - outcome mix (top 15)
- **Source**: `/api/analytics/by-supplier?limit=25` but only top 15 visualised.
- **Formula**: per supplier, `count(*)` by outcome.
- **Reading**: stacked horizontal bars showing how each top supplier's claims break down by outcome. A long red Reject segment on a high-volume bar = suspect quality.
- **Drill-down**: none directly on the chart (use the table below for click-to-filter).

### Supplier reject-rate league
- **Source**: same endpoint, sorted client-side by rejectRate descending.
- **Formula**: `count(Reject) / count(vetted)` per supplier.
- **Reading**: top of the list = highest reject share. Red Reject badge = >15 %, amber = 7-15 %, green = <7 %. Accept badge red = <70 %, amber = 70-85 %, green = >85 %.
- **Drill-down**: row click adds the supplier to the global filter.

### Top countries by claim volume
- **Source**: `/api/analytics/by-country`.
- **Formula**: `count(*) GROUP BY country`, sorted descending.
- **Reading**: top 20 countries. Bars are horizontal so long names fit.
- **Drill-down**: bar click adds country to the global filter.

## Cross-filter behaviour
- Global filter narrows everything. E.g. setting `supplier = X` will leave only that supplier's row in the league.
- Supplier table row clicks add to the `supplier` filter.
- Country bar clicks add to the `country` filter.

## Common interpretations
1. **A small-volume supplier with > 20 % reject rate** = warning sign but small sample; click to filter and inspect their failed parts list on the Overview Top Parts widget.
2. **A high-volume supplier with a large red Reject stack and large yellow Z-Code stack** = the team is unsure whether to accept their claims (quality concerns + customer pressure). Supplier 8D candidate.
3. **`Not assigned` showing as a top supplier** = many parts come in without supplier attribution; data quality issue worth fixing upstream.
4. **United Kingdom dominates country volume by 5-10x** = expected because it's JCB's home market; non-UK reject rates are surfaced separately on People & Places.
5. **A country at the top of the bar chart but with sub-baseline accept rate** = either real market issues or vetter bias on non-UK claims; cross-check with the People & Places Country reject-rate league.

## Known limitations
- The "outcome mix" chart shows the **top 15 suppliers by total claim count**, so high-reject low-volume suppliers won't appear in that chart (they will in the league table).
- The Top countries chart sorts by volume, not by accept rate. For an accept-rate-sorted view, see [People & Places > Country reject-rate league](09-people-and-places.md#country-reject-rate-league).
- No deep country-level drill (e.g. by region) - improvement candidate.
