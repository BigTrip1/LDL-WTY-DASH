# 5. The 11 dashboard tabs

A one-paragraph summary of every tab. For chart-by-chart detail, follow the deep-doc link at the end of each section — they live in [`docs/pages/`](../pages/).

## 1. Overview

The command-centre landing. 6 auto-generated **headline cards** at the top tell you the most important changes since the last upload. Below: year-on-year clustered bars, the Jan-2025 regime impact donut, monthly volume with a 3-month rolling line, top movers (last 90d vs prior 90d) for any dimension, symptom sparklines for the top 8 NLP tags, the failure-area Pareto, the model league, the DOA-by-build-cohort area chart, a live activity feed of the 14 most recent claims, top countries and the top 15 failed parts.
[Deep doc → 01-overview.md](../pages/01-overview.md)

## 2. Build-date

For finding **batch incidents**. Top: monthly bars of build-cohort claim volume with the DOA-rate line overlaid (with a "mature cohorts only" toggle to hide cohorts younger than 90 days). Bottom: a heatmap of build month × production area with red dots on cells that are ≥ +2σ above the mean — those are statistical anomalies worth a look. Click any column header to drill into that build-month's top parts, areas, tags, dealers and countries.
[Deep doc → 02-build-date.md](../pages/02-build-date.md)

## 3. Vetting & regime

Quantifies the Jan-2025 vetting-manager change. Top: pre-vs-post outcome mix table with delta in percentage points. Middle: monthly outcome stacked bar with the regime line. Bottom: the vetter scorecard (click any row to toggle that vetter into the per-vetter trend chart). The scorecard header has **All / Top 6 / Clear** buttons.
[Deep doc → 03-vetting-and-regime.md](../pages/03-vetting-and-regime.md)

## 4. Outcome drivers

Pick a **dimension** (Area, Theme, Model, Supplier, tPeriod, Hours bucket, Country, Dealer, Detection, Tag) from the dropdown. Three side-by-side tables surface the **values most likely to be rejected**, **most accepted**, and **most z-coded** for that dimension. Bottom: a Sankey diagram showing claim flow through `Area → Failed part → Outcome`. Clicking any table row narrows the global filter to that value.
[Deep doc → 04-outcome-drivers.md](../pages/04-outcome-drivers.md)

## 5. Description NLP

Mines the free-text claim descriptions using a deterministic regex tagger (no AI). Tag cloud + tag frequency bar + top unigrams / bigrams tables + tag-trend multi-line chart + tag co-occurrence pairs + vetter-notes top tokens + free-text search across descriptions. Click tags to add them to the trend chart; click search rows to open the claim modal.
[Deep doc → 05-description-nlp.md](../pages/05-description-nlp.md)

## 6. Supply & geography

Top: a **bubble world map** with one bubble per country, sized by claim count and coloured by accept rate (green ≥ 85 %, amber 70-85 %, red < 70 %). Middle: supplier outcome-mix stacked bars + the supplier reject-rate league (row-click filters by that supplier). Bottom: top countries bar (also click-to-filter).
[Deep doc → 06-supply-and-geography.md](../pages/06-supply-and-geography.md)

## 7. Reliability

Soft reliability metrics. Hours-to-fail distribution (9 buckets from 0-25 hrs to 5000-20000 hrs). tPeriod mix per model (100 % stacked horizontal bars). DOA league table sorted by DOA rate descending.
[Deep doc → 07-reliability.md](../pages/07-reliability.md)

## 8. Operations

Top: PDI/UV escape rate KPI + top 25 PDI escape parts. Cannot-Detect share over time (showing the post-regime explosion). Time-to-vet monthly average + per-vetter. ASD ownership split. Z-Code drivers (top parts + areas). Day-of-week + month-of-year seasonality. **Daily activity calendar heatmap** (last 365 days). Theme integrity audit at the bottom.
[Deep doc → 08-operations.md](../pages/08-operations.md)

## 9. People & places

Recidivism is the headline. Four stat tiles: total unique serials, serials with ≥2 / ≥5 / ≥10 claims. Then the **repeat-offender machines** table (≥5 claims) with the new **"Likely repeat"** column flagging machines that have ≥3 claims AND ≥180 days since their last vetted claim. Dealer scorecard + customer scorecard + country reject-rate league round out the tab.
[Deep doc → 09-people-and-places.md](../pages/09-people-and-places.md)

## 10. Data quality & drill-down

Ten anomaly KPI cards (missing dates, unvetted backlog, theme mislabels, etc.) at the top. Below: the **paginated claims grid** with all 25 source columns visible. Click any row to open the claim modal with the full description, vetter notes, and related-serial panel.
[Deep doc → 10-data-quality.md](../pages/10-data-quality.md)

## 11. Full report

Renders the long-form analytical [`REPORT.md`](../REPORT.md) inline with executive-style markdown styling. Includes a `Download .md` button and a `Print / Save PDF` button. For a *date-bounded* PDF report use the separate **Report** route in the navbar (not this tab).
[Deep doc → 11-full-report.md](../pages/11-full-report.md)
