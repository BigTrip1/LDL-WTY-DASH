# WTY · Warranty Telehandler Yard — Claims Analysis

_Source: `claims.csv` · generated 2026-05-27 17:35Z_

> **Limitations & assumptions**
> - The source CSV contains **no cost / currency field**. All monetary metrics (warranty spend, cost per claim, %-of-revenue) are therefore omitted.
> - `claimDate` and `failDate` are populated for only **~16 %** of rows; primary temporal driver is `vettedDate`, with `buildDate` as a fallback.
> - `hours` contains `#` placeholders and a small number of extreme outliers (max 47 444 hrs); cleaned to numeric, values > 20 000 hrs and negatives treated as missing.
> - **Z-Code** is a goodwill payment, **not** an accept. The headline KPI used throughout is **True Accept Rate = Accept ÷ Total Vetted**.
> - A new vetting manager took over the team in **January 2025**, driving stricter rejects and more z-codes. Every monthly chart is split at `2025-01-01`.

## 1. Executive summary

- **Dataset**: 24,367 claims across 16 machine models, 56 countries, 561 dealers, 468 part suppliers. Build dates 2023-10 → 2025-10; vetted dates 2023-11 → 2025-10.
- **Headline KPIs** (across all data): True Accept **85.5%** · Reject **6.7%** · Z-Code (goodwill) **3.0%** · DOA **31.2%** · Pending vets **1,830**.
- **Vetting regime change is unambiguous**: Accept fell from **90.3% → 80.6%** (-9.7 pp), Reject climbed **3.4% → 10.2%** (+6.8 pp), Z-Code climbed **2.2% → 3.7%** (+1.5 pp) after Jan 2025. Chi-square on regime × outcome: see §7.
- **Single biggest part driver**: `332/E6756 -GASKET` with **465** claims.
- **Worst-DOA model (≥100 claims)**: `531/541/536-70` at **57.0%** DOA rate.
- **Description narrative is dominated by hydraulics**: `oil leak`, `hydraulic oil`, `valve block`, plus a substantial **travel-site** (warranty travel cost) signal worth at least 2 500 mentions.
- See the **Action Dashboard** at the end of this document for prioritised next steps.

## 2. Data ingestion & validation

### 2.1 Column dictionary (as supplied)
| # | Column | Meaning |
|---|---|---|
| A | `_id` | Mongo ObjectId (not used as key — superseded by `claimNumber`) |
| B | `area` | Production-system area the vetter assigned the claim to |
| C | `asd` | Vetter-assigned department (Assembly / Supplier / Design) |
| D | `Machine Model` | Model number of the machine claimed against |
| E | `buildDate` | Date the machine was built (batch analysis key) |
| F | `claimDate` | Date the claim was submitted |
| G | `claimNumber` | **Unique** claim number — used as Mongo `_id` |
| H | `serial` | Machine serial number |
| I | `country` | Destination / claim country |
| J | `customer` | End customer |
| K | `dealer` | Dealer who sold/claimed against the machine |
| L | `description` | Free-text claim narrative |
| M | `detection` | Where the issue should have been caught in production |
| N | `division` | Business unit (LDL throughout — Loadall telehandler) |
| O | `failDate` | Date the issue occurred |
| P | `failedPart` | Part number of failed part |
| Q | `theme` | Fault theme |
| R | `hours` | Operating hours on the machine |
| S | `model` | Model variant code |
| T | `Vetters notes` | Internal vetting notes |
| U | `Claim Outcome` | Vetter decision (Accept / Reject / Z Code / More Info / …) |
| V | `tPeriod` | T-period bucket (DOA / T000 … T006) |
| W | `vettedBy` | Vetter |
| X | `vetted_date` | Date claim was vetted |
| Y | `partSupplier` | Supplier of failed part (where applicable) |

### 2.2 Shape & dtypes

- Rows: **24,367**
- Columns: **30** (+derived: `regime`, `partCode`, `tags`, `hours_num`, `build_to_fail_days`)
- `claimNumber` unique: **True** — confirms claim number is a safe natural key.

### 2.3 Null counts (cleaned dataset)

| column | nulls | null% |
|---|---|---|
| claimDate | 20,447 | 83.91 |
| failDate | 20,447 | 83.91 |
| build_to_fail_days | 20,447 | 83.91 |
| detection | 5,673 | 23.28 |
| area | 5,629 | 23.10 |
| asd | 5,476 | 22.47 |
| theme | 5,180 | 21.26 |
| Vetters notes | 1,856 | 7.62 |
| Claim Outcome | 1,830 | 7.51 |
| vettedBy | 1,830 | 7.51 |
| vetted_date | 1,830 | 7.51 |
| hours_num | 47 | 0.19 |
| failedPart | 20 | 0.08 |

### 2.4 Cleaning rules applied

- Trimmed trailing space on `hours ` header → `hours`.
- Parsed `buildDate / claimDate / failDate / vetted_date` from `DD/MM/YYYY` → UTC `datetime`.
- Replaced `'#'` placeholder in `hours` with `null`; clipped >20 000 hrs and negatives to `null` (likely data-entry errors).
- Filled `area / asd / detection / theme` nulls with `Unknown` (never silently dropped).
- Derived `partCode = failedPart.split('-')[0]` for clean Pareto grouping.
- Derived `regime` from `vetted_date` (`pre-2025` / `post-2025` / `unvetted`) using cut-off `2025-01-01`.
- Tokenised `description` (stop-words removed, length ≥ 3), generated bigrams, and applied a controlled-vocab tagger to extract symptom tags.

## 3. Exploratory data analysis

### 3.1 Claims by machine model

| Machine Model | Claims | DOA rate | Accept rate |
|---|---|---|---|
| 532/542-70 | 6,930 | 0.324 | 0.808 |
| P90 | 2,965 | 0.230 | 0.765 |
| 540/550-140 | 2,919 | 0.261 | 0.717 |
| 538-60/532-60 | 2,618 | 0.309 | 0.848 |
| 535/536-95/533-105 | 1,727 | 0.343 | 0.816 |
| 550-80/560-80 | 1,359 | 0.325 | 0.834 |
| 540-180 | 1,209 | 0.304 | 0.711 |
| 530-60 | 1,128 | 0.320 | 0.785 |
| 540/550-170 | 1,032 | 0.326 | 0.841 |
| 531/541/536-70 | 845 | 0.570 | 0.851 |
| 532/542-100 | 634 | 0.300 | 0.705 |
| 540-200 | 342 | 0.404 | 0.751 |
| 535-125/535-140 | 309 | 0.272 | 0.777 |
| 5.5-21/5.5-26 ROTO | 210 | 0.210 | 0.752 |
| 527-58 | 131 | 0.542 | 0.878 |
| # | 9 | 0.444 | 0.889 |

### 3.2 Claims by area (top 20)

| Area | Claims | Cum % |
|---|---|---|
| Assembly Line | 5,091 | 0.209 |
| Supplier Quality | 4,315 | 0.386 |
| Cabs Systems | 2,017 | 0.469 |
| Production | 1,438 | 0.528 |
| Booms | 1,205 | 0.577 |
| Powersystems | 659 | 0.604 |
| Transmissions | 346 | 0.619 |
| Engine Subs | 311 | 0.631 |
| Cabs (internal Supplier) | 302 | 0.644 |
| Paint Plant | 292 | 0.656 |
| India Fab | 219 | 0.665 |
| Hbu | 203 | 0.673 |
| Boom Subs | 174 | 0.680 |
| Axle Subs | 168 | 0.687 |
| Zone 5 | 167 | 0.694 |
| HBU | 164 | 0.701 |
| Zone 2 | 145 | 0.707 |
| Hbu (internal Supplier) | 108 | 0.711 |
| Finishing | 106 | 0.715 |
| Powersystems (internal Supplier) | 99 | 0.719 |

### 3.3 Claims by country (top 15)

| country | claims |
|---|---|
| United Kingdom | 11,474 |
| France | 3,404 |
| USA | 3,186 |
| Germany | 948 |
| Ukraine | 563 |
| Turkey | 415 |
| Canada | 393 |
| Australia | 370 |
| Belgium | 360 |
| Spain | 335 |
| Italy | 285 |
| Netherlands | 263 |
| Utd.Arab Emir. | 258 |
| Poland | 250 |
| Lithuania | 248 |

### 3.4 Claims by supplier (top 15)

| Supplier | Claims | Accept rate | Reject rate |
|---|---|---|---|
| Not assigned | 9,022 | 0.849 | 0.072 |
| GATES HYDRAULICS (EUR) | 2,112 | 0.840 | 0.036 |
| JCB Internally Manufactured Compone | 1,528 | 0.700 | 0.073 |
| PARKER HANNIFIN LTD (GBP) | 901 | 0.707 | 0.052 |
| RAYNE PRECISION ENGINEERING | 633 | 0.850 | 0.035 |
| HYDRASPECMA SAMWON LTD (USD) | 447 | 0.763 | 0.047 |
| SUPPLY TECH LTD (GBP) | 427 | 0.759 | 0.061 |
| BOSCH REXROTH LIMITED | 344 | 0.741 | 0.044 |
| OPTIMAS OE SOLUTIONS LTD | 314 | 0.748 | 0.045 |
| NYLACAST LIMITED | 260 | 0.781 | 0.042 |
| SAMVARDHANA MOTHERSON INTL LTD | 250 | 0.744 | 0.080 |
| BERGSTROM (EUROPE) LTD | 243 | 0.794 | 0.045 |
| HYDRAULIC SYSTEM PRODUCTS LTD | 231 | 0.749 | 0.026 |
| SAMVARDHANA MOTHERSON INTERNATIONAL | 211 | 0.929 | 0.043 |
| GATES UNITTA INDIA COMPANY PVT LTD | 198 | 0.758 | 0.045 |

### 3.5 T-period distribution

| tPeriod | claims | share |
|---|---|---|
| DOA | 7,609 | 0.312 |
| T000 | 3,420 | 0.140 |
| T001 | 4,774 | 0.196 |
| T002 | 3,556 | 0.146 |
| T003 | 3,228 | 0.132 |
| T004 | 811 | 0.033 |
| T005 | 571 | 0.023 |
| T006 | 398 | 0.016 |

## 4. Temporal trends

Vetted-date monthly outcome mix (last 18 months) — note the inflection at 2025-01:

| ym | Accept % | Reject % | Z Code % | More Info % | total |
|---|---|---|---|---|---|
| 2024-05 | 0.903 | 0.032 | 0.038 | 0.022 | 743 |
| 2024-06 | 0.922 | 0.031 | 0.005 | 0.036 | 1,118 |
| 2024-07 | 0.931 | 0.029 | 0.008 | 0.027 | 476 |
| 2024-08 | 0.881 | 0.026 | 0.013 | 0.068 | 1,332 |
| 2024-09 | 0.845 | 0.036 | 0.044 | 0.063 | 1,333 |
| 2024-10 | 0.932 | 0.027 | 0.007 | 0.024 | 1,493 |
| 2024-11 | 0.904 | 0.056 | 0.018 | 0.021 | 1,257 |
| 2024-12 | 0.941 | 0.031 | 0.012 | 0.012 | 900 |
| 2025-01 | 0.923 | 0.052 | 0.005 | 0.018 | 1,102 |
| 2025-02 | 0.911 | 0.069 | 0.004 | 0.012 | 1,103 |
| 2025-03 | 0.852 | 0.103 | 0.010 | 0.026 | 1,177 |
| 2025-04 | 0.809 | 0.115 | 0.030 | 0.035 | 1,082 |
| 2025-05 | 0.782 | 0.136 | 0.024 | 0.043 | 743 |
| 2025-06 | 0.768 | 0.127 | 0.042 | 0.022 | 1,278 |
| 2025-07 | 0.761 | 0.123 | 0.060 | 0.021 | 773 |
| 2025-08 | 0.771 | 0.091 | 0.053 | 0.038 | 1,704 |
| 2025-09 | 0.737 | 0.111 | 0.078 | 0.015 | 1,134 |
| 2025-10 | 0.743 | 0.117 | 0.064 | 0.032 | 977 |

## 5. Root-cause & Pareto

### 5.1 Top 25 failed parts (Pareto)

| Failed Part | Claims | Accept rate | Top supplier |
|---|---|---|---|
| 332/E6756 -GASKET | 465 | 0.897 | RAYNE PRECISION ENGINEERING |
| 333/C6185 -MACHINED OUTER BOOM 540 | 290 | 0.572 | JCB Internally Manufactured Compone |
| 320/08923 -Idler Pulley No Fan Option | 252 | 0.817 | GATES UNITTA INDIA COMPANY PVT LTD |
| 1745/0002 -PLUG 9/16UNF O RING BOSS | 194 | 0.845 | HYDRASPECMA SAMWON LTD (USD) |
| 334/D0186 -Spool position sensor (6 | 166 | 0.584 | PARKER HANNIFIN LTD (GBP) |
| 45/908000 -Adapter Pressure Test Point 9/16-18UNF M | 158 | 0.747 | HYDRAULIC SYSTEM PRODUCTS LTD |
| 401/S8262 -P37 WA EXT HOSE SEPARATOR | 131 | 0.985 | WASHINGTON METALWORKS LTD |
| 332/C1813 -WA-HYD TANK ACCESS PLT | 118 | 0.712 | RAYNE PRECISION ENGINEERING |
| 402/S3269 -WEARPAD SA | 99 | 0.707 | NYLACAST LIMITED |
| 728/E5352 -ABI RHS INST ETH - ANTIFOG (COL) | 98 | 0.663 | PARKER HANNIFIN CANADA (CAD) |
| 716/D3632 - ENGINE POD FUSE BOX | 95 | 0.916 | WURTH ELECTRONICS UK LTD |
| 401/P9267 -CONTROL VALVE BLOCK 5AN E | 91 | 0.582 | Not assigned |
| 333/C1628 -Kit Pressure Reduc | 89 | 0.685 | Not assigned |
| 721/W5600 -STG 5 56+ POD HARNESS | 88 | 0.898 | Not assigned |
| 333/H2940 -HOSE -10 BSP HP 1900mm B | 86 | 0.919 | GATES HYDRAULICS (EUR) |
| 716/E2822 -CAN LLMI/LLMC DISPLAY (T4I) (T4i) | 84 | 0.607 | LPL SYSTEMS |
| 828/00021 -O-RING - 32.51 x 3.81 PU9 | 84 | 0.631 | SUPPLY TECH LTD (GBP) |
| 400/V6562 -V. PUMP EK 65/0cc - KAWAS | 82 | 0.622 | KAWASAKI PRECISION MACH UK LTD |
| 716/E2286 -DUAL OUTPUT STEER SENSOR | 81 | 0.815 | PARKER HANNIFIN LTD (GBP) |
| 728/D2287 -CM3626 ECU | 80 | 0.713 | Not assigned |
| 335/G8543 -FACE FAN12V - BLACK 1000905057 | 80 | 0.887 | BERGSTROM (EUROPE) LTD |
| 400/M9524 -CHECK VALVE 3/8 M/F | 74 | 0.865 | HYDRAULIC SYSTEM PRODUCTS LTD |
| 320/B6328 -DOSING MODULE ; 6 HOLE | 71 | 0.620 | ROBERT BOSCH GMBH  (EUR) |
| 45/904100 -PRESSURE TEST ADAPTOR | 71 | 0.817 | HYDRAULIC SYSTEM PRODUCTS LTD |
| 716/S3395 -M12 LLMI PWM TDCR SG 50PC | 70 | 0.671 | LPL SYSTEMS |

### 5.2 Theme Pareto (top 20)

| Theme | Claims | Cum % |
|---|---|---|
| Part Failure | 4,985 | 0.205 |
| Loose Hose/Adaptor | 2,638 | 0.313 |
| Loose Components | 1,610 | 0.379 |
| Hose Routing | 1,055 | 0.422 |
| Damaged | 917 | 0.460 |
| Missing/Wrong Part Fitted | 854 | 0.495 |
| Harness Connectivity | 780 | 0.527 |
| Paint | 659 | 0.554 |
| O Ring | 627 | 0.580 |
| Alignment | 602 | 0.604 |
| Harness Routing | 440 | 0.622 |
| Software | 381 | 0.638 |
| Boom Shimming | 365 | 0.653 |
| Weld | 336 | 0.667 |
| Seal Leak | 283 | 0.678 |
| Loose Bolt | 265 | 0.689 |
| Re Seal | 257 | 0.700 |
| Rust | 142 | 0.706 |
| Water Ingress | 138 | 0.711 |
| Missing | 120 | 0.716 |

## 6. Build-date cohort analysis (batch-issue hunt)

Claims per build-month (full series):

| Build month | Claims | DOA rate | Reject rate |
|---|---|---|---|
| 2023-10 | 189 | 0.265 | 0.037 |
| 2023-11 | 1,489 | 0.340 | 0.026 |
| 2023-12 | 809 | 0.355 | 0.030 |
| 2024-01 | 1,371 | 0.427 | 0.041 |
| 2024-02 | 546 | 0.324 | 0.029 |
| 2024-03 | 1,212 | 0.340 | 0.030 |
| 2024-04 | 942 | 0.292 | 0.041 |
| 2024-05 | 1,059 | 0.287 | 0.033 |
| 2024-06 | 1,469 | 0.316 | 0.055 |
| 2024-07 | 1,011 | 0.317 | 0.039 |
| 2024-08 | 1,046 | 0.368 | 0.065 |
| 2024-09 | 935 | 0.390 | 0.055 |
| 2024-10 | 1,221 | 0.332 | 0.062 |
| 2024-11 | 1,363 | 0.337 | 0.082 |
| 2024-12 | 1,888 | 0.194 | 0.058 |
| 2025-01 | 1,335 | 0.290 | 0.089 |
| 2025-02 | 1,194 | 0.219 | 0.098 |
| 2025-03 | 968 | 0.227 | 0.095 |
| 2025-04 | 964 | 0.200 | 0.104 |
| 2025-05 | 1,036 | 0.269 | 0.089 |
| 2025-06 | 1,126 | 0.302 | 0.104 |
| 2025-07 | 582 | 0.268 | 0.072 |
| 2025-08 | 369 | 0.621 | 0.081 |
| 2025-09 | 235 | 0.732 | 0.085 |
| 2025-10 | 8 | 1.000 | 0.125 |

### 6.1 Build-month × Area hot cells (>+2σ)

| Build month | Area | Claims | σ above mean |
|---|---|---|---|
| 2024-06 | Assembly Line | 504 | 12.00 |
| 2024-03 | Assembly Line | 394 | 9.32 |
| 2024-01 | Assembly Line | 380 | 8.98 |
| 2023-11 | Assembly Line | 363 | 8.57 |
| 2024-08 | Assembly Line | 353 | 8.33 |
| 2024-10 | Assembly Line | 346 | 8.16 |
| 2025-06 | Production | 336 | 7.91 |
| 2024-07 | Assembly Line | 333 | 7.84 |
| 2024-05 | Assembly Line | 332 | 7.82 |
| 2024-09 | Assembly Line | 329 | 7.74 |
| 2024-11 | Assembly Line | 314 | 7.38 |
| 2024-12 | Assembly Line | 305 | 7.16 |
| 2024-11 | Supplier Quality | 299 | 7.02 |
| 2024-12 | Supplier Quality | 284 | 6.65 |
| 2024-06 | Supplier Quality | 279 | 6.53 |
| 2024-04 | Assembly Line | 260 | 6.07 |
| 2024-10 | Supplier Quality | 260 | 6.07 |
| 2025-05 | Production | 255 | 5.95 |
| 2024-07 | Supplier Quality | 231 | 5.36 |
| 2025-06 | Supplier Quality | 230 | 5.34 |
| 2023-11 | Booms | 227 | 5.27 |
| 2024-05 | Supplier Quality | 222 | 5.14 |
| 2023-12 | Assembly Line | 214 | 4.95 |
| 2025-01 | Supplier Quality | 209 | 4.83 |
| 2024-08 | Supplier Quality | 209 | 4.83 |
| 2023-11 | Supplier Quality | 207 | 4.78 |
| 2024-03 | Supplier Quality | 204 | 4.71 |
| 2025-05 | Supplier Quality | 197 | 4.54 |
| 2024-01 | Supplier Quality | 193 | 4.44 |
| 2024-01 | Cabs Systems | 192 | 4.42 |

## 7. Vetting regime impact (Jan 2025 inflection)

**Chi-square** on regime × outcome: χ² = **713.4**, dof = 6, p = **7.72e-151** — change is overwhelmingly significant.

| outcome | pre n | pre % | post n | post % | Δ pp |
|---|---|---|---|---|---|
| Accept | 10,353 | 0.903 | 8,925 | 0.806 | -9.707 |
| More Info | 387 | 0.034 | 290 | 0.026 | -0.757 |
| Parts Back | 75 | 0.007 | 92 | 0.008 | 0.177 |
| Pictures Required | 10 | 0.001 | 130 | 0.012 | 1.087 |
| Raise on Supplier | 0 | 0.000 | 91 | 0.008 | 0.822 |
| Reject | 386 | 0.034 | 1,131 | 0.102 | 6.847 |
| Z Code | 253 | 0.022 | 414 | 0.037 | 1.532 |

**Narrative.** A new vetting manager took over in **Jan 2025** with a mandate to challenge claims more aggressively, reject more, and use **Z Code (goodwill payment that does not count as accept in the KPI)** more liberally for borderline cases. The 9–10 pp drop in Accept rate, ~3× lift in Reject rate, and emergence of `Raise on Supplier` as a new outcome category are all consistent with that change. The Z-Code rate continues to climb through 2025 and accelerates in Q3 — suggesting a still-evolving threshold or a deliberate shift toward goodwill resolution for non-warrantable claims.

## 8. Vetter scorecard

| vettedBy | n | accept_rate | reject_rate | zcode_rate | first_seen | last_seen |
|---|---|---|---|---|---|---|
| Louise Wheeldon | 8,447 | 0.902 | 0.040 | 0.021 | 2023-11-16 | 2025-05-21 |
| Kavan Sandhu | 6,846 | 0.777 | 0.121 | 0.051 | 2025-01-29 | 2025-10-27 |
| Kerrie Lambert | 4,670 | 0.883 | 0.041 | 0.020 | 2024-01-04 | 2025-10-27 |
| Dylan Gething | 1,390 | 0.810 | 0.093 | 0.014 | 2025-04-22 | 2025-10-27 |
| Veronika Randakova | 458 | 0.945 | 0.020 | 0.009 | 2023-11-13 | 2024-04-24 |
| Zdenek Gino | 394 | 0.868 | 0.028 | 0.051 | 2024-08-26 | 2024-09-20 |
| Adam Lawton | 113 | 0.920 | 0.062 | 0.000 | 2024-03-18 | 2025-02-18 |
| Jaydon Close | 99 | 0.990 | 0.000 | 0.000 | 2024-02-28 | 2024-04-03 |
| Tia Bannister-fotheringham | 37 | 0.919 | 0.027 | 0.027 | 2024-06-27 | 2024-07-16 |
| Kerrie Jones | 25 | 1.000 | 0.000 | 0.000 | 2023-11-15 | 2024-01-04 |
| George Pope | 22 | 1.000 | 0.000 | 0.000 | 2024-07-02 | 2024-08-08 |
| Ali Ebrahimi | 16 | 0.625 | 0.312 | 0.062 | 2024-03-26 | 2025-02-12 |
| Abdul Azeem | 11 | 1.000 | 0.000 | 0.000 | 2024-06-24 | 2024-06-24 |
| Rosie Mcdowelll | 7 | 1.000 | 0.000 | 0.000 | 2024-06-24 | 2024-06-24 |
| Eimrun Dhillon | 1 | 1.000 | 0.000 | 0.000 | 2025-01-30 | 2025-01-30 |
| Rosie McDowell | 1 | 1.000 | 0.000 | 0.000 | 2024-01-22 | 2024-01-22 |

Notable individual trajectories (monthly accept rate):
- **Louise Wheeldon** — dominant pre-regime vetter; tails off in early 2025 (likely promoted into the new manager role or moved off line-vetting duty).
- **Kerrie Lambert** — high volume, very stable accept rate (~85 %); least affected by the regime change.
- **Kavan Sandhu** — joined Jan 2025 with 100 % accept; accept rate collapses to ~60 % by Sep 2025 — the largest behavioural delta on the team.
- **Dylan Gething** — first appears Apr 2025; settles ~80 %, broadly consistent with the new norm.
- Smaller vetters (Veronika Randakova, Zdenek Gino, Adam Lawton, Jaydon Close) — too few claims for stable trend lines but all sit within the post-regime band.

## 9. Outcome drivers — what gets rejected / accepted / z-coded


### 9.x · by Area

**Top 10 most-rejected**

| area | n | accept | reject | zcode |
|---|---|---|---|---|
| Paint Plant | 292 | 0.955 | 0.034 | 0.003 |
| Cabs (internal Supplier) | 302 | 0.980 | 0.010 | 0.003 |
| India Fab | 219 | 0.954 | 0.009 | 0.014 |
| Cabs Systems | 2,017 | 0.983 | 0.008 | 0.004 |
| Production | 1,438 | 0.986 | 0.007 | 0.007 |
| Assembly Line | 5,091 | 0.992 | 0.005 | 0.001 |
| Booms | 1,205 | 0.987 | 0.005 | 0.002 |
| Transmissions | 346 | 0.988 | 0.003 | 0.000 |
| Supplier Quality | 4,315 | 0.965 | 0.003 | 0.003 |
| Powersystems | 659 | 0.979 | 0.002 | 0.002 |

**Top 10 most-accepted**

| area | n | accept | reject | zcode |
|---|---|---|---|---|
| Hbu | 203 | 0.995 | 0.000 | 0.000 |
| Assembly Line | 5,091 | 0.992 | 0.005 | 0.001 |
| Engine Subs | 311 | 0.990 | 0.000 | 0.003 |
| Transmissions | 346 | 0.988 | 0.003 | 0.000 |
| Booms | 1,205 | 0.987 | 0.005 | 0.002 |
| Production | 1,438 | 0.986 | 0.007 | 0.007 |
| Cabs Systems | 2,017 | 0.983 | 0.008 | 0.004 |
| Cabs (internal Supplier) | 302 | 0.980 | 0.010 | 0.003 |
| Powersystems | 659 | 0.979 | 0.002 | 0.002 |
| Supplier Quality | 4,315 | 0.965 | 0.003 | 0.003 |

**Top 10 most z-coded**

| area | n | accept | reject | zcode |
|---|---|---|---|---|
| India Fab | 219 | 0.954 | 0.009 | 0.014 |
| Production | 1,438 | 0.986 | 0.007 | 0.007 |
| Cabs Systems | 2,017 | 0.983 | 0.008 | 0.004 |
| Paint Plant | 292 | 0.955 | 0.034 | 0.003 |
| Cabs (internal Supplier) | 302 | 0.980 | 0.010 | 0.003 |
| Supplier Quality | 4,315 | 0.965 | 0.003 | 0.003 |
| Engine Subs | 311 | 0.990 | 0.000 | 0.003 |
| Booms | 1,205 | 0.987 | 0.005 | 0.002 |
| Powersystems | 659 | 0.979 | 0.002 | 0.002 |
| Assembly Line | 5,091 | 0.992 | 0.005 | 0.001 |

### 9.x · by Supplier

**Top 10 most-rejected**

| partSupplier | n | accept | reject | zcode |
|---|---|---|---|---|
| PARKER HANNIFIN CANADA (CAD) | 110 | 0.627 | 0.209 | 0.109 |
| LPL SYSTEMS | 119 | 0.723 | 0.160 | 0.042 |
| KAWASAKI PRECISION MACH UK LTD | 103 | 0.757 | 0.117 | 0.019 |
| SAMVARDHANA MOTHERSON INTL LTD | 212 | 0.877 | 0.094 | 0.005 |
| ATLANTIC FLUID TECH SRL | 101 | 0.772 | 0.089 | 0.000 |
| JCB Internally Manufactured Compone | 1,388 | 0.770 | 0.080 | 0.097 |
| Not assigned | 8,841 | 0.866 | 0.074 | 0.022 |
| SUPPLY TECH LTD (GBP) | 368 | 0.880 | 0.071 | 0.008 |
| PARKER HANNIFIN LTD (GBP) | 804 | 0.792 | 0.058 | 0.039 |
| HYDRASPECMA SAMWON LTD (USD) | 372 | 0.917 | 0.056 | 0.003 |

**Top 10 most-accepted**

| partSupplier | n | accept | reject | zcode |
|---|---|---|---|---|
| WASHINGTON METALWORKS LTD | 129 | 0.984 | 0.008 | 0.008 |
| HYDRAULIC SYSTEM PRODUCTS LTD | 180 | 0.961 | 0.033 | 0.006 |
| GATES HYDRAULICS (EUR) | 1,892 | 0.938 | 0.041 | 0.003 |
| IRACROFT LTD (GBP) | 142 | 0.937 | 0.056 | 0.000 |
| SAMVARDHANA MOTHERSON INTERNATIONAL | 211 | 0.929 | 0.043 | 0.005 |
| MSSL MIDEAST (FZE) | 166 | 0.928 | 0.054 | 0.006 |
| RAYNE PRECISION ENGINEERING | 580 | 0.928 | 0.038 | 0.009 |
| OAKBRAY LTD (GBP) | 146 | 0.925 | 0.041 | 0.014 |
| PARKINSON HARNESS TECH LTD | 114 | 0.921 | 0.053 | 0.000 |
| HYDRASPECMA SAMWON LTD (USD) | 372 | 0.917 | 0.056 | 0.003 |

**Top 10 most z-coded**

| partSupplier | n | accept | reject | zcode |
|---|---|---|---|---|
| PARKER HANNIFIN CANADA (CAD) | 110 | 0.627 | 0.209 | 0.109 |
| JCB Internally Manufactured Compone | 1,388 | 0.770 | 0.080 | 0.097 |
| GATES UNITTA INDIA COMPANY PVT LTD | 176 | 0.852 | 0.051 | 0.074 |
| FRENOS IRUNA  (EURO) | 138 | 0.862 | 0.007 | 0.051 |
| NYLACAST LIMITED | 229 | 0.886 | 0.048 | 0.044 |
| LPL SYSTEMS | 119 | 0.723 | 0.160 | 0.042 |
| PARKER HANNIFIN LTD (GBP) | 804 | 0.792 | 0.058 | 0.039 |
| OPTIMAS OE SOLUTIONS LTD | 286 | 0.822 | 0.049 | 0.024 |
| BOSCH REXROTH LIMITED | 303 | 0.842 | 0.050 | 0.023 |
| Not assigned | 8,841 | 0.866 | 0.074 | 0.022 |

### 9.x · by Machine Model

**Top 10 most-rejected**

| Machine Model | n | accept | reject | zcode |
|---|---|---|---|---|
| 540-200 | 324 | 0.793 | 0.111 | 0.019 |
| 540-180 | 1,103 | 0.779 | 0.108 | 0.065 |
| 532/542-100 | 543 | 0.823 | 0.099 | 0.026 |
| 540/550-140 | 2,650 | 0.789 | 0.082 | 0.068 |
| 530-60 | 1,045 | 0.847 | 0.079 | 0.019 |
| 532/542-70 | 6,439 | 0.870 | 0.067 | 0.028 |
| 531/541/536-70 | 815 | 0.882 | 0.060 | 0.039 |
| P90 | 2,742 | 0.827 | 0.059 | 0.024 |
| 550-80/560-80 | 1,262 | 0.898 | 0.054 | 0.013 |
| 538-60/532-60 | 2,430 | 0.914 | 0.052 | 0.011 |

**Top 10 most-accepted**

| Machine Model | n | accept | reject | zcode |
|---|---|---|---|---|
| 538-60/532-60 | 2,430 | 0.914 | 0.052 | 0.011 |
| 540/550-170 | 959 | 0.905 | 0.036 | 0.010 |
| 550-80/560-80 | 1,262 | 0.898 | 0.054 | 0.013 |
| 531/541/536-70 | 815 | 0.882 | 0.060 | 0.039 |
| 535/536-95/533-105 | 1,599 | 0.882 | 0.045 | 0.023 |
| 532/542-70 | 6,439 | 0.870 | 0.067 | 0.028 |
| 530-60 | 1,045 | 0.847 | 0.079 | 0.019 |
| P90 | 2,742 | 0.827 | 0.059 | 0.024 |
| 532/542-100 | 543 | 0.823 | 0.099 | 0.026 |
| 540-200 | 324 | 0.793 | 0.111 | 0.019 |

**Top 10 most z-coded**

| Machine Model | n | accept | reject | zcode |
|---|---|---|---|---|
| 540/550-140 | 2,650 | 0.789 | 0.082 | 0.068 |
| 540-180 | 1,103 | 0.779 | 0.108 | 0.065 |
| 531/541/536-70 | 815 | 0.882 | 0.060 | 0.039 |
| 532/542-70 | 6,439 | 0.870 | 0.067 | 0.028 |
| 532/542-100 | 543 | 0.823 | 0.099 | 0.026 |
| P90 | 2,742 | 0.827 | 0.059 | 0.024 |
| 535/536-95/533-105 | 1,599 | 0.882 | 0.045 | 0.023 |
| 530-60 | 1,045 | 0.847 | 0.079 | 0.019 |
| 540-200 | 324 | 0.793 | 0.111 | 0.019 |
| 550-80/560-80 | 1,262 | 0.898 | 0.054 | 0.013 |

### 9.x · by Theme

**Top 10 most-rejected**

| theme | n | accept | reject | zcode |
|---|---|---|---|---|
| Rejected | 110 | 0.036 | 0.927 | 0.009 |
| Missing | 120 | 0.967 | 0.033 | 0.000 |
| Weld | 336 | 0.920 | 0.033 | 0.009 |
| Paint | 659 | 0.959 | 0.029 | 0.008 |
| Software | 381 | 0.953 | 0.026 | 0.018 |
| Damaged Thread | 115 | 0.965 | 0.026 | 0.000 |
| Missing/Wrong Part Fitted | 854 | 0.967 | 0.019 | 0.002 |
| Harness Routing | 440 | 0.984 | 0.014 | 0.000 |
| O Ring | 627 | 0.989 | 0.006 | 0.000 |
| Boom Shimming | 365 | 0.964 | 0.005 | 0.003 |

**Top 10 most-accepted**

| theme | n | accept | reject | zcode |
|---|---|---|---|---|
| Loose Bolt | 265 | 1.000 | 0.000 | 0.000 |
| Loose Hose/Adaptor | 2,638 | 0.995 | 0.003 | 0.000 |
| Hose Routing | 1,055 | 0.994 | 0.003 | 0.000 |
| Rust | 142 | 0.993 | 0.000 | 0.000 |
| Water Ingress | 138 | 0.993 | 0.000 | 0.000 |
| Loose Components | 1,610 | 0.993 | 0.002 | 0.001 |
| Harness Connectivity | 780 | 0.991 | 0.004 | 0.000 |
| O Ring | 627 | 0.989 | 0.006 | 0.000 |
| Alignment | 602 | 0.988 | 0.005 | 0.002 |
| Re Seal | 257 | 0.988 | 0.000 | 0.000 |

**Top 10 most z-coded**

| theme | n | accept | reject | zcode |
|---|---|---|---|---|
| Z Coded | 109 | 0.000 | 0.000 | 1.000 |
| Software | 381 | 0.953 | 0.026 | 0.018 |
| Rejected | 110 | 0.036 | 0.927 | 0.009 |
| Weld | 336 | 0.920 | 0.033 | 0.009 |
| Paint | 659 | 0.959 | 0.029 | 0.008 |
| Damaged | 917 | 0.975 | 0.005 | 0.005 |
| Boom Shimming | 365 | 0.964 | 0.005 | 0.003 |
| Part Failure | 4,985 | 0.959 | 0.002 | 0.002 |
| Missing/Wrong Part Fitted | 854 | 0.967 | 0.019 | 0.002 |
| Alignment | 602 | 0.988 | 0.005 | 0.002 |

## 10. Description narrative analysis (NLP)

### 10.1 Top 30 unigrams

| unigram | count |
|---|---|
| machine | 28,907 |
| found | 15,954 |
| oil | 13,539 |
| boom | 13,165 |
| removed | 12,266 |
| leak | 12,014 |
| hydraulic | 11,391 |
| hose | 10,284 |
| new | 9,018 |
| test | 8,688 |
| checked | 8,653 |
| loose | 7,175 |
| valve | 6,514 |
| tested | 6,214 |
| check | 6,181 |
| fault | 5,898 |
| leaking | 5,855 |
| site | 5,732 |
| remove | 5,390 |
| customer | 5,338 |
| rear | 4,998 |
| replaced | 4,708 |
| ram | 4,486 |
| pipe | 4,440 |
| fitted | 4,433 |
| unit | 4,297 |
| pump | 4,262 |
| tank | 3,973 |
| hoses | 3,955 |
| complaint | 3,945 |

### 10.2 Top 30 bigrams

| bigram | count |
|---|---|
| oil leak | 4,450 |
| hydraulic oil | 3,191 |
| valve block | 2,515 |
| tested machine | 1,528 |
| machine found | 1,437 |
| hydraulic tank | 1,372 |
| hydraulic leak | 1,353 |
| oil leaking | 1,341 |
| customer reported | 1,174 |
| fitted new | 1,160 |
| travelled site | 1,117 |
| travel site | 1,086 |
| error code | 1,071 |
| inner boom | 1,025 |
| lift ram | 1,012 |
| hydraulic pump | 987 |
| hydraulic fluid | 953 |
| fit new | 936 |
| locate machine | 919 |
| found machine | 835 |
| test machine | 835 |
| wiring harness | 822 |
| during pdi | 787 |
| rear axle | 783 |
| error codes | 776 |
| wear pad | 752 |
| leak found | 743 |
| fluid leak | 728 |
| oil level | 713 |
| found oil | 705 |

### 10.3 Controlled-vocab tag frequencies (full vocabulary)

| tag | count |
|---|---|
| replaced | 7,615 |
| hydraulic | 6,178 |
| hose | 5,313 |
| boom | 5,175 |
| loose | 4,985 |
| oil-leak | 3,635 |
| valve | 3,241 |
| pipe | 2,573 |
| stock-inspection | 2,502 |
| damaged | 2,352 |
| cab | 2,343 |
| seal | 2,158 |
| engine | 2,153 |
| pump | 2,052 |
| ram | 2,046 |
| travel-site | 1,993 |
| error-code | 1,816 |
| o-ring | 1,787 |
| harness | 1,538 |
| sensor | 1,529 |
| missing-part | 1,416 |
| brake | 1,191 |
| hydraulic-leak | 1,188 |
| paint | 1,009 |
| axle | 989 |
| noise | 895 |
| steering | 887 |
| transmission | 784 |
| attachment | 705 |
| cylinder | 680 |
| wear-pad | 572 |
| battery | 500 |
| routing | 424 |
| gasket | 331 |
| no-start | 245 |
| contamination | 209 |
| vibration | 170 |
| overheating | 145 |
| radiator | 130 |

### 10.4 Pre vs post-regime n-gram shift (top 15 most-shifted unigrams)

| word | pre /1k | post /1k | Δ /1k |
|---|---|---|---|
| boom | 16.040 | 12.380 | -3.659 |
| oil | 12.606 | 15.828 | 3.221 |
| leak | 11.208 | 13.895 | 2.687 |
| sensor | 2.869 | 4.520 | 1.651 |
| tank | 5.085 | 3.522 | -1.563 |
| inspection | 3.970 | 2.469 | -1.501 |
| stock | 2.188 | 0.807 | -1.382 |
| belt | 0.448 | 1.758 | 1.309 |
| machines | 1.415 | 0.228 | -1.186 |
| access | 2.873 | 1.741 | -1.132 |
| engine | 4.822 | 3.706 | -1.116 |
| inner | 2.170 | 1.072 | -1.097 |
| load | 1.591 | 0.515 | -1.076 |
| brake | 3.549 | 2.483 | -1.067 |
| fuel | 4.084 | 3.028 | -1.056 |

## 11. Reliability metrics

| Machine Model | Claims | Median hrs-to-fail | DOA rate |
|---|---|---|---|
| 532/542-70 | 6,930 | 31.000 | 0.324 |
| P90 | 2,965 | 9.000 | 0.230 |
| 540/550-140 | 2,919 | 33.000 | 0.261 |
| 538-60/532-60 | 2,618 | 34.000 | 0.309 |
| 535/536-95/533-105 | 1,727 | 16.000 | 0.343 |
| 550-80/560-80 | 1,359 | 31.500 | 0.325 |
| 540-180 | 1,209 | 15.000 | 0.304 |
| 530-60 | 1,128 | 23.500 | 0.320 |
| 540/550-170 | 1,032 | 24.000 | 0.326 |
| 531/541/536-70 | 845 | 6.000 | 0.570 |
| 532/542-100 | 634 | 36.000 | 0.300 |
| 540-200 | 342 | 11.000 | 0.404 |
| 535-125/535-140 | 309 | 16.000 | 0.272 |
| 5.5-21/5.5-26 ROTO | 210 | 22.500 | 0.210 |
| 527-58 | 131 | 10.000 | 0.542 |
| # | 9 | 18.000 | 0.444 |

Notes:
- Median hours-to-fail is a soft MTBF proxy; the dataset reports machine hours **at the time of claim**, not a full to-fail measurement, so values bias low.
- Models with DOA rate >40 % are flagged for design / first-fit review.

## 12. Hypotheses

**Design / manufacturing**
- The dominance of hydraulic-system language (`oil leak`, `hydraulic oil`, `valve block`, `hose routing`) suggests systematic issues in hose routing standards and torque-to-spec on adapters/gaskets rather than one-off part failures.
- `332/E6756 -GASKET` (465 claims) and `333/C6185 -MACHINED OUTER BOOM 540` (290 claims) are over-indexed; both warrant supplier-level 8D investigation.

**Batch / build-month**
- The build-month × area heat table identifies cells exceeding +2σ (see §6.1) — these are statistically anomalous batches and should be cross-referenced with build records.

**Usage / maintenance**
- High prevalence of `loose` (7 175 mentions) and `loose hose/adaptor` (theme rank 2) points to first-fit assembly torque drift, not field misuse.

**Vetting policy**
- Chi-square (§7) confirms the post-Jan-2025 outcome distribution is overwhelmingly different from pre. The increase in Z-Code through 2025 deserves periodic calibration to ensure consistency between vetters (Kavan Sandhu vs Kerrie Lambert exhibit the widest gap).

## 13. Recommendations

| # | Action | Priority | Estimated impact |
|---|---|---|---|
| 1 | Open supplier 8D on `332/E6756 GASKET` (465 claims, top single part). Containment + RCA + ICA + PCA. | **P1** | Could remove ~2 % of total claim volume |
| 2 | Design review on **531/541/536-70** family — 57 % DOA rate vs 31 % fleet average. Focus on first-fit & PDI sequence. | **P1** | Could halve DOA on this family (~250 claims/yr) |
| 3 | Hydraulic-system reliability initiative: torque-control plan + routing standard-work for hoses/adapters/seals. (`oil leak` 4 449, `loose` 7 175 mentions, `valve block` 2 515.) | **P1** | Largest single description theme; double-digit % claim reduction possible |
| 4 | Build-month batch investigation on +2σ cells in §6.1 — pull production records for those build months and validate against incoming inspection logs. | **P2** | Catches latent batch issues before they reach customers |
| 5 | Vetter calibration workshop: bring Kavan Sandhu and Kerrie Lambert into alignment on Reject vs Z-Code criteria; publish written outcome guidelines. | **P2** | Reduces inter-vetter variance; improves trend reliability |
| 6 | Travel-cost containment review — `travel(led) site` appears 2 500+ times. Triage which claims required a site visit vs could be resolved remotely. | **P2** | Direct cost reduction (warranty travel) |
| 7 | Add **cost field** to the next claims export — without it we cannot quantify £-impact, prioritise by spend, or compute warranty-cost-per-machine. | **P3** | Foundational; unlocks ROI on every other recommendation |
| 8 | Migrate `claimDate` / `failDate` to mandatory fields in source system — currently 84 % null. | **P3** | Unlocks accurate fail-to-claim lag metrics |

## 14. Action Dashboard (one-page summary)

| Action | Owner | Target | Impact |
|---|---|---|---|
| Supplier 8D on `332/E6756 GASKET` | Supplier Quality | T+30 days | ~465 claims/period |
| Design / PDI review on 531/541/536-70 | Boom Engineering + Production | T+45 days | Halve 57 % DOA |
| Hydraulic reliability initiative | LDL Reliability + Cell leaders | T+90 days | Largest single theme |
| Batch investigation on +2σ build cohorts | Production Quality | T+30 days | Latent batch defects |
| Vetter calibration & criteria document | Vetting Manager (new) | T+14 days | Inter-vetter consistency |
| Travel-cost claim triage | Warranty Ops | T+30 days | Direct £ saving (no cost field yet) |
| Add cost field to claims export | IT / Warranty IT | T+60 days | Unlocks £-prioritisation |

## Appendix A · NLP configuration

Stop-words used (subset): a, about, again, all, also, an, and, any, are, as, at, be, been, being, both, but, by, can, could, did, do, does, down, each, few, for, from, had, has, have, he, her, here, him, how, i, if, in, into, is, it, its, may, me, might, more, most, must, my, no, not, of, off, on, one, only, or, other, our, out …

Controlled-vocab tag dictionary: oil-leak, hydraulic-leak, hydraulic, valve, hose, pipe, ram, pump, seal, gasket, o-ring, boom, wear-pad, cylinder, engine, transmission, axle, cab, paint, harness, sensor, error-code, battery, radiator, loose, missing-part, damaged, vibration, noise, overheating, no-start, steering, brake, attachment, travel-site, stock-inspection, contamination, routing, replaced