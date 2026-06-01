# Page 7 - Reliability

## Purpose
Soft reliability metrics: how long machines run before claiming, how their warranty period mix looks per model, and which models have the worst dead-on-arrival rates.

Primary user: reliability / design engineer comparing models and looking for "this family fails earlier than others" patterns.

## Layout map

```
+-----------------------------------------------------------------------------+
| Sticky header                                                               |
+-----------------------------------------------------------------------------+
| Row 1 (2-col)                                                               |
|   Hours-to-fail distribution  |  tPeriod mix per model (top 15)             |
|   Histogram (9 buckets)        |  100% stacked horizontal bars               |
+-----------------------------------------------------------------------------+
| Row 2 (full-width)                                                          |
|   DOA league table - all models                                             |
|   Sorted by DOA rate descending; badges colour-code severity                |
+-----------------------------------------------------------------------------+
```

## Widget catalogue

### Hours-to-fail distribution
- **Source**: `/api/analytics/hours-distribution`.
- **Formula**: `$bucket` on the cleaned `hours` field with boundaries `[0,25,50,100,250,500,1000,2500,5000,20000]`. Rows where `hours` is null (incl. the original `#` placeholder) are excluded.
- **Reading**: most claims arrive in the first 0-25 hours bucket (DOA / very early failures). Long tail at 1000-5000 hrs = end-of-warranty cliff.

### tPeriod mix per model (top 15)
- **Source**: `/api/analytics/tperiod-mix`.
- **Formula**: `count(*) GROUP BY (machineModel, tPeriod)` -> normalised to 0-100 % per model.
- **Reading**: each horizontal bar is one model showing its mix of DOA / T000 / T001 / T002 / T003 / T004 / T005 / T006 segments. Higher T = later in warranty life. A model with a fat red DOA section = bad first-fit. A model that's mostly green/blue (high T) = field failures more common than birth defects.
- **Limit**: top 15 models by claim count.

### DOA league table - all models
- **Source**: `/api/analytics/by-model`.
- **Formula**: per model, `count(*)`, `count(DOA)/count(*)`, plus outcome rates.
- **Reading**: sorted by DOA rate descending. DOA badge: red >40 %, amber 30-40 %, green <30 %. Use to spot which models have a first-fit problem disproportionate to their volume.

## Cross-filter behaviour
- Global filter narrows the universe before grouping. E.g. setting `country = USA` reveals only USA claims' hours distribution.
- No click handlers on this page's charts/tables - by design, since the league is a read-only summary.

## Common interpretations
1. **Hours histogram dominated by 0-25 bucket** = first-fit and birth-defect issues are the biggest contributors; production process / supplier quality should own this.
2. **A model with > 50 % DOA rate** = systematic first-fit issue. Push for design / PDI review. Example: `531/541/536-70` at 57 %.
3. **A model with > 80 % combined DOA + T000** = quality issues caught in the first weeks of life. Usually a supplier-related defect.
4. **A model with even spread across tPeriods** = field failures dominating; investigate operating conditions / customer mix.
5. **Hours histogram has very few claims in the 1000-2500 bucket** = good - means the bulk-of-life period is reliable.

## Known limitations
- `hours` field has ~0.2 % null after cleaning (the original `#` placeholders).
- The hours histogram doesn't account for the customer fleet population, so absolute counts are biased by how many of each hours-bucket exist in the field. For a true reliability rate you'd need denominator data (fleet population).
- DOA league table includes every model regardless of volume - low-n models can show extreme rates that aren't statistically meaningful. Cross-reference the Claims column.
- No Kaplan-Meier survival curve yet (improvement candidate in IMPROVEMENTS.md).
