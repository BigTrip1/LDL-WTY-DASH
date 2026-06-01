# 6. Generating a PDF report

The dashboard has **two** report surfaces. Don't confuse them.

| Surface | Route | What it shows |
|---|---|---|
| **Full report tab** | inside the dashboard | The static long-form `REPORT.md` analytical document. |
| **Report route** | top nav → `Report` | A customisable PDF generator with a date-range picker. |

This section is about the **Report route** (the PDF generator).

## Walkthrough

1. Click **Report** in the top nav. The picker page opens.
2. Pick a **From / To** date range, or click one of the quick chips (`All`, `Last 30d`, `Last 90d`, `YTD`, `2024`, `2025`, `Pre-regime`, `Post-regime`).
3. Look at the **Contents preview** card — it lists the 12 sections the report will include so you know what you're about to produce.
4. Click **Generate report**.
5. Wait a few seconds. A `loading N/25` badge in the action bar shows progress as the ~25 underlying queries finish.
6. When the report is ready (about 5–15 seconds depending on filter size), click **Print / Save as PDF** in the top action bar.
7. Your browser opens its print dialog. Pick **Save as PDF** as the destination and click **Save**.

## What's in the PDF

| § | Section |
|---|---|
| 1 | Headline KPIs (8 tiles) |
| 2 | Auto-generated headlines (rule-based narrative cards) |
| 3 | Temporal trends (monthly + year-on-year) |
| 4 | Vetting regime impact (pre vs post Jan-2025) |
| 5 | Pareto & root-cause (area Pareto + model league + top 25 parts) |
| 6 | Build-date cohort (DOA area chart) |
| 7 | Operations (PDI, Cannot-Detect, ASD, Z-Code, seasonality) |
| 8 | Vetter scorecard |
| 9 | People & places (recidivism, dealers, customers, countries) |
| 10 | Supply chain (top 20 suppliers) |
| 11 | NLP (top symptom tags + bigrams) |
| 12 | Data quality |

A footer note with limitations is appended automatically.

## Navigation tips

- The **TOC sidebar** on the left of the report (visible on wide screens, hidden on small screens and in the print output) lets you click any `§N · Section` to scroll directly to it.
- Each section has an anchor (`#section-1` … `#section-12`) so you can share a direct deep-link.

## How does the print PDF differ from the screen?

The print stylesheet:

- Hides the navbar, footer, sticky action bar, and the (i) tooltips.
- Switches the body to a white background with dark text for paper readability.
- Keeps JCB-yellow accents on headings and small icons.
- Uses A4 with 10-14 mm margins.
- Applies `break-inside-avoid` on every section + chart card so they don't split across pages.
- Re-styles Recharts tooltips invisible (you can't hover a printed page).

## Range matters

The **date range** picked here only narrows by `vettedDate`. It does NOT inherit the filter chips from the dashboard - the PDF report is intentionally standalone so anyone can read it without your local filter state.

## Want to re-run weekly without clicking?

See [`scripts/weekly.bat`](../../scripts/weekly.bat). Register it with Windows Task Scheduler:

```bat
schtasks /create /tn "WTY weekly report" /tr "C:\Users\Vince\OneDrive\Desktop\wty\scripts\weekly.bat" /sc weekly /d MON /st 06:00 /ru "%USERNAME%"
```

That writes a new `archives/REPORT-YYYY-MM-DD.md` every Monday at 06:00, and refreshes the canonical `REPORT.md` on the Full Report tab.
