# IMPROVEMENTS

A living roadmap of everything that could make WTY better - visual polish, functional gaps, deeper analytical insights, performance work, operational maturity. Every item is **rule-based / deterministic** so the air-gapped deployment posture is preserved.

## How to read this doc

Each item carries:

- **Priority**: P1 (do soon), P2 (do next), P3 (nice to have).
- **Effort**: XS (<1h), S (a few hours), M (1-2 days), L (multi-day).
- **Files**: where the change happens.
- **Outline**: 3-6 line implementation sketch.

Items already fixed in the May-2026 audit are listed in [Section 0 - shipped in this audit](#0-shipped-in-the-may-2026-audit) for traceability.

---

## 0. Shipped in the May-2026 audit

### Round 1 (May-2026 bug fixes + docs)

1. **Empty-chart bug across all tabs** - removed `flex-1` from `ChartCard`'s `CardContent` so the explicit `h-[XXXpx]` from `bodyClassName` is honoured. ([frontend/src/components/charts/ChartCard.tsx](../frontend/src/components/charts/ChartCard.tsx))
2. **Vetter scorecard click feedback** - replaced the invisible 5 % yellow tint with a checkbox column, line-color left-stripe, bold yellow vetter name on selected rows, and an All / Top 6 / Clear header. Initial selection is now seeded via `useEffect` so the chart never renders blank. ([frontend/src/pages/tabs/RegimeTab.tsx](../frontend/src/pages/tabs/RegimeTab.tsx))
3. **Cross-filter from driver tables** - Outcome Drivers tab now wires row clicks to the global filter for every mappable dimension. ([frontend/src/pages/tabs/DriversTab.tsx](../frontend/src/pages/tabs/DriversTab.tsx))
4. **Cross-filter from Supply tab** - Supplier reject-rate league rows and the Top countries bar are now click-to-filter. ([frontend/src/pages/tabs/SupplyTab.tsx](../frontend/src/pages/tabs/SupplyTab.tsx))
5. **`setFilters` plumbed to every tab** that benefits from cross-filtering. ([frontend/src/pages/Dashboard.tsx](../frontend/src/pages/Dashboard.tsx))
6. **Per-page documentation library** under [docs/pages/](pages/) - 11 docs, one per dashboard tab, full widget catalogue + drill-down map + common interpretations.
7. **AI-free operation evidence** in [docs/AI-FREE-OPERATION.md](AI-FREE-OPERATION.md) + a runnable `scripts/audit-no-ai.bat` so the air-gapped go-live is defensible.

### Round 2 (May-2026 improvements pass + manual + tooltips)

8. **Tab persistence in URL** - dashboard tab is now stored in `?tab=` and survives page reloads / link shares. ([frontend/src/pages/Dashboard.tsx](../frontend/src/pages/Dashboard.tsx))
9. **Theme integrity auto-fix at ingest** - `themeOriginal` field preserves the source value when a vetter typed an outcome decision into the theme field; `theme` is normalised to `Unknown` so the dimension stays clean. ([backend/src/services/ingest.ts](../backend/src/services/ingest.ts), [backend/src/models/Claim.ts](../backend/src/models/Claim.ts))
10. **Code-split dashboard tabs** with `React.lazy` + `Suspense`. The initial bundle now ships only the Overview tab; the other 10 load on demand. ([frontend/src/pages/Dashboard.tsx](../frontend/src/pages/Dashboard.tsx))
11. **Customer global filter chip** - top 200 customers exposed in `/api/meta`, added as a filter chip with click-to-filter from the People & Places customer scorecard. ([frontend/src/components/FilterBar.tsx](../frontend/src/components/FilterBar.tsx), [backend/src/routes/meta.ts](../backend/src/routes/meta.ts), [backend/src/services/filters.ts](../backend/src/services/filters.ts), [frontend/src/pages/tabs/PeoplePlacesTab.tsx](../frontend/src/pages/tabs/PeoplePlacesTab.tsx))
12. **Recurrence prediction** - `/serial-recidivism` now returns `daysSinceLastClaim` + `likelyRepeat` (rule: ≥3 claims AND ≥180 days since last vetted claim). Rendered as a "Likely repeat" column on People & Places. ([backend/src/routes/analytics.ts](../backend/src/routes/analytics.ts), [frontend/src/pages/tabs/PeoplePlacesTab.tsx](../frontend/src/pages/tabs/PeoplePlacesTab.tsx))
13. **Calendar heatmap (last 365 days)** - new `/api/analytics/daily-heatmap` endpoint + a GitHub-style heatmap on the Operations tab (366 cells, anchored to the latest vettedDate). ([backend/src/routes/analytics.ts](../backend/src/routes/analytics.ts), [frontend/src/components/charts/CalendarHeatmap.tsx](../frontend/src/components/charts/CalendarHeatmap.tsx), [frontend/src/pages/tabs/OperationsTab.tsx](../frontend/src/pages/tabs/OperationsTab.tsx))
14. **Sankey diagram** - new `/api/analytics/sankey` endpoint + a Recharts Sankey on the Outcome Drivers tab showing `Area → Failed part → Outcome` flow (top 8 areas × top 12 parts × 4 outcome buckets). ([backend/src/routes/analytics.ts](../backend/src/routes/analytics.ts), [frontend/src/pages/tabs/DriversTab.tsx](../frontend/src/pages/tabs/DriversTab.tsx))
15. **World bubble map** - air-gapped (no external geo data); equirectangular projection with hand-coded country centroids, stylised continent outlines, bubble size = claim count, bubble colour = accept rate. Click any bubble to filter. ([frontend/src/lib/countryCoords.ts](../frontend/src/lib/countryCoords.ts), [frontend/src/components/charts/WorldBubbleMap.tsx](../frontend/src/components/charts/WorldBubbleMap.tsx), [frontend/src/pages/tabs/SupplyTab.tsx](../frontend/src/pages/tabs/SupplyTab.tsx))
16. **Z-score anomaly dots on the build heatmap** - cells ≥ +2σ above the heatmap mean (and ≥20 in absolute terms) get a red dot in the top-right corner. Tooltip shows the z-score. ([frontend/src/pages/tabs/BuildTab.tsx](../frontend/src/pages/tabs/BuildTab.tsx))
17. **Weekly auto-report** - `scripts/weekly.bat` re-runs `scripts/report.py`, saves a date-stamped copy to `archives/`, and refreshes the canonical `REPORT.md`. Task Scheduler one-liner in [README §11.1](../README.md#111-weekly-auto-report).
18. **Legends + tooltips on every chart** - audited and added `<Legend />` + `<Tooltip />` to the 10 Recharts charts that were missing one (Build cohort, DoW + MoY seasonality, Time to vet, Cannot Detect, Hours-to-fail, NLP tag bar, Overview DOA + Top countries, Supply top countries).
19. **`info` / `formula` / `source` on every ChartCard** - 14 ChartCards that lacked an explanation now have one.
20. **Info tooltips on plain Card widgets** - PeoplePlaces `Stat` + DataQuality `AnomCard` both now expose an `info` prop and an (i) icon next to the label.
21. **Per-chip `helpText` on the filter bar** - every one of the 12 filter chips has a plain-English explanation behind an (i) icon inside the popover.
22. **/report page polish** - sticky left TOC, anchor IDs (`#section-1` … `#section-12`), summary sentence under each section header, contents preview on the date-picker card, info tooltips on every KpiBox.
23. **Operation manual** - new `/manual` route + navbar link with a sidebar TOC, markdown rendering, prev/next nav, print stylesheet, and a backend `GET /api/manual` + `GET /api/manual/:id` endpoint that serves the 9 markdown sections in [docs/manual/](manual/).
24. **Markdown renderer hardening** - the in-app renderer now handles fenced code blocks (`` ``` ``), has a hard iteration cap as a defence against grammar bugs, and no longer infinite-loops on ASCII-art diagrams that contain pipe characters. The renderer is used by both `/manual` and the Full report tab. ([frontend/src/lib/markdown.ts](../frontend/src/lib/markdown.ts))
25. **Batch-script hardening pass** - every `.bat` in the repo now (a) prepends `%SystemRoot%\System32` to `PATH` so Windows system commands always resolve correctly even when launched from a git-bash terminal (the Unix `find` / `timeout` ports would otherwise shadow them and hang); (b) pre-cleans stale `:4000` / `:5173` listeners before launching; (c) reports node + npm versions in the banner. Affected: [start-dev.bat](../start-dev.bat), [start-prod.bat](../start-prod.bat), [stop.bat](../stop.bat).
26. **`stop.bat` accuracy** - now probes with `tasklist /FI WINDOWTITLE` before issuing a `taskkill`, so the `[stop] / [skip]` report reflects reality. Also kills stray `tsx.exe` watchers and orphan listeners on :4000 / :5173 even when the original cmd windows were closed manually. ([stop.bat](../stop.bat))
27. **`scripts/weekly.bat` upgrades** - accepts the CSV path as `%1` (no more hard-coded path), uses PowerShell `Get-Date` instead of the brittle `wmic`/regional-locale parser, writes a per-run log to `archives/weekly-YYYY-MM-DD.log` (so Task Scheduler runs leave a trail), and trims the archive folder to the last 26 reports + logs. ([scripts/weekly.bat](../scripts/weekly.bat))
28. **`scripts/audit-no-ai.bat` extended + falls back to PowerShell** - vendor list updated for 2024-2026 (added groq, deepseek, perplexity, replicate, together-ai, xai, ollama, vllm, stable-diffusion, sentence-transformers, gensim, etc.); also scans for AI-vendor API-key env-vars; if `rg` isn't on PATH the script now invokes [scripts/audit-no-ai.ps1](../scripts/audit-no-ai.ps1) which uses only built-in PowerShell `Select-String` (no external tool required for the air-gapped customer). Runs in ~1 s. ([scripts/audit-no-ai.bat](../scripts/audit-no-ai.bat), [scripts/audit-no-ai.ps1](../scripts/audit-no-ai.ps1))
29. **Launcher reliability rewrite** - the stop→start cycle now works deterministically across any number of restarts. The two root-cause issues were: (a) the spawned `start "..." cmd /k "...nested "%ROOT%backend" quotes..."` line was fragile when cmd parsed the nested quotes; and (b) the inline wait loops used `timeout /t 1 /nobreak` which prints `ERROR: Input redirection is not supported` whenever stdin isn't an interactive console (Task Scheduler, ssh, scripts launched from another script). Fixes:<br>&nbsp;&nbsp;- New helper scripts [`scripts/_run-mongod.bat`](../scripts/_run-mongod.bat), [`scripts/_run-prod-server.bat`](../scripts/_run-prod-server.bat), [`scripts/_run-dev-backend.bat`](../scripts/_run-dev-backend.bat), [`scripts/_run-dev-frontend.bat`](../scripts/_run-dev-frontend.bat) each receive their args via clean positional parameters - no nested-quote risk. Each helper keeps its window open with a diagnostic message if the child process exits, so the user can always read why something failed.<br>&nbsp;&nbsp;- All `timeout /t N /nobreak >nul` calls replaced with `ping -n N+1 127.0.0.1 >nul`. ping ignores stdin entirely so the launchers run cleanly under Task Scheduler, ssh, redirection, or any other non-interactive context.
31. **Supply & Geography tab — full redesign + real world map** -<br>&nbsp;&nbsp;**a. Real country borders** - replaced the 10 hand-drawn stylised continent paths with all 177 country borders from the Natural Earth 110m world atlas (public domain). Generated offline by [scripts/build-world-paths.mjs](../scripts/build-world-paths.mjs) which decodes the topojson arcs, projects to a 1000x500 equirectangular canvas, runs Douglas-Peucker simplification at 0.4 px tolerance, and bakes the result into [frontend/src/lib/worldShapes.ts](../frontend/src/lib/worldShapes.ts) (~94 KB, ~42 KB gzipped, only loaded when the Supply tab opens thanks to React.lazy). Air-gapped friendly: zero runtime fetches.<br>&nbsp;&nbsp;**b. Choropleth + bubble overlay** - countries with data are filled with a JCB-yellow ramp scaled by claim count, and the bubbles ride on top with accept-rate colouring. The two encodings reinforce each other rather than competing.<br>&nbsp;&nbsp;**c. Hero-first layout** - map is now the **first** card on the tab, full-width, ~520 px tall, with a graticule background. Below it is a new 5-tile **Regional rollup** (Europe / Americas / APAC / MEA / Other) with share-of-total bars, then a **Top-3 supplier podium** with click-to-filter, a **Supply concentration semicircular gauge** (top-5 share with verdict), the existing supplier outcome-mix + reject league side by side, and finally the top-20 countries bar at the bottom.<br>&nbsp;&nbsp;**d. Country name harmonisation** - [frontend/src/lib/countryCoords.ts](../frontend/src/lib/countryCoords.ts) gained `COUNTRY_NAME_TO_ATLAS` mapping (USA -> 'United States of America', Czech Republic -> 'Czechia', Utd.Arab Emir. -> 'United Arab Emirates') and `COUNTRY_REGION` for the rollup.<br>&nbsp;&nbsp;Files: [SupplyTab.tsx](../frontend/src/pages/tabs/SupplyTab.tsx), [WorldBubbleMap.tsx](../frontend/src/components/charts/WorldBubbleMap.tsx), [worldShapes.ts](../frontend/src/lib/worldShapes.ts) (NEW), [countryCoords.ts](../frontend/src/lib/countryCoords.ts), [scripts/build-world-paths.mjs](../scripts/build-world-paths.mjs) (NEW).
33. **Custom filter groups - new end-user feature**:<br>&nbsp;&nbsp;**a. Backend** - new [FilterGroup](../backend/src/models/Claim.ts) mongoose model with a unique `(dimension, name)` index and zod-validated [REST CRUD](../backend/src/routes/groups.ts) at `/api/groups`. 11 dimensions supported (model, country, supplier, area, tPeriod, outcome, dealer, vetter, theme, customer, tags).<br>&nbsp;&nbsp;**b. Admin UI** - new [FilterGroupsManager](../frontend/src/components/admin/FilterGroupsManager.tsx) block on the Admin page. Pick a dimension across the top, see existing groups on the left (inline edit + delete), build new ones on the right with a fast search + select-all-filtered helper.<br>&nbsp;&nbsp;**c. MultiSelect integration** - every filter chip on the dashboard now loads groups for its dimension (`useQuery` with 30 s staleTime) and renders them as a "Groups · click to apply" pill row at the top of the popover. Pills are tri-state: empty, partial (some values selected), full (all members selected). Click toggles every member value into / out of the current selection.<br>&nbsp;&nbsp;**d. Pure client-side expansion** - the URL/state always uses the individual values (e.g. `?model=535V125,540V140`), so every existing analytics endpoint works unchanged. The group is just a UX shortcut. New types: [FilterDimension, FilterGroup](../frontend/src/lib/api.ts).
34. **Supply tab v3 - supplier highlights + working gauge**:<br>&nbsp;&nbsp;Replaced the misleading "top-3 trophy podium" (which suggested winners) with a **3-card highlights panel**: (1) Highest claim volume (workload); (2) Worst reject rate (quality flag, min-30-claims threshold); (3) Heaviest Z-Code share (goodwill / commercial review, must have at least one Z-Code). Each card excludes `Not assigned` placeholders, has a coloured accent border matching its tone, and is click-to-filter.<br>&nbsp;&nbsp;Fixed the semicircular concentration gauge: the previous angle parameterisation (`-π/2 + pct*π`) produced a vertical needle and broken fill arc. Now correctly sweeps left → top → right (`π * (1 - pct)` with Y-flip), shows the arc fill matching the needle position, and reads 59.0% with a clear "moderate" verdict for the real (top-5 named suppliers) concentration.
35. **Supply tab v2 - interactive map + better filter semantics**:<br>&nbsp;&nbsp;**a. Map fills the card** - the WorldBubbleMap card now reserves a 620 px-tall body, and the SVG `viewBox` crops to the populated latitude band (75°N to 55°S) so Antarctica + the empty north-pole strip don't waste space. The map now occupies the full width AND height of its container with `preserveAspectRatio="xMidYMid slice"`.<br>&nbsp;&nbsp;**b. Pan + zoom** - mouse wheel zooms toward the cursor (10% per notch, up to 12.5x), drag-anywhere pans, double-click resets to the home view. Bubble radius and stroke widths scale inversely with zoom so they stay legible at every level. New zoom-in / zoom-out / home buttons live in a small toolbar top-right, and a live `Nx` zoom indicator shows when the user is off the home view. No external dep - pure SVG `viewBox` manipulation in [WorldBubbleMap.tsx](../frontend/src/components/charts/WorldBubbleMap.tsx).<br>&nbsp;&nbsp;**c. Model filter targets the variant SKU, not the family** - previously the `model` filter chip mapped to MongoDB's `machineModel` field (broad family codes like '535-125/535-140', 16 distinct values). It now targets the `model` field (specific variant SKU like '535V125', 90 distinct values). The 'by model' family-rollup charts elsewhere still GROUP BY `machineModel` deliberately - the family rollup is genuinely useful so it's preserved. Added an index on the `model` field. Files: [Claim.ts](../backend/src/models/Claim.ts), [filters.ts](../backend/src/services/filters.ts), [meta.ts](../backend/src/routes/meta.ts), [FilterBar.tsx](../frontend/src/components/FilterBar.tsx).<br>&nbsp;&nbsp;**d. Supply concentration excludes 'Not assigned'** - the gauge now computes the top-5 share over **named** suppliers only, jumping from a misleading 16.5% (dominated by 'Not assigned' placeholder) to a meaningful 59% (real concentration). [SupplyTab.tsx](../frontend/src/pages/tabs/SupplyTab.tsx).
33. **PROD vs DEV identity is now provable** - three layers of proof so the user (and any future automation) can confirm which mode is actually running:<br>&nbsp;&nbsp;**a. IPv6 connection fix** - Default `MONGO_URI` changed from `mongodb://localhost:27017` to `mongodb://127.0.0.1:27017` in [backend/src/db.ts](../backend/src/db.ts), [backend/.env](../backend/.env), [backend/.env.example](../backend/.env.example). Node 18+ resolves `localhost` to IPv6 (`::1`) first via `dns.lookup(verbatim: true)`, but the Windows MongoDB service binds only to IPv4 - the resulting `ECONNREFUSED ::1:27017` crash was a regular cause of "the launcher crashes" reports.<br>&nbsp;&nbsp;**b. /api/health upgrade** - [backend/src/index.ts](../backend/src/index.ts) now returns `{ ok, mode: 'production'|'development', port, frontendDistServed, uptimeSec, ts }`. The mode is derived from `NODE_ENV` at process start, so it's tamper-evident.<br>&nbsp;&nbsp;**c. Per-window identity banners** - the spawned server windows print a big PRODUCTION (or DEVELOPMENT) banner with NODE_ENV, port, Vite-status and dist path BEFORE node starts, so you can never confuse a prod window with a dev window even with all four open at once.<br>&nbsp;&nbsp;**d. Post-launch verification table** - [scripts/_verify-prod.ps1](../scripts/_verify-prod.ps1) (7 checks) and [scripts/_verify-dev.ps1](../scripts/_verify-dev.ps1) (7 checks incl. Vite :5173) probe every required service, assert the correct mode from /api/health, and render a compact green/red latency table. Both launchers invoke their respective verifier and ABORT the launch (skip the browser-open) if any check fails. Common rendering logic factored to [scripts/_verify-common.ps1](../scripts/_verify-common.ps1).<br>&nbsp;&nbsp;Result: a user double-clicking `start-prod.bat` sees `PRODUCTION mode confirmed. 7/7 checks passed.` before the browser opens, or a `[FAIL]` row with a specific hint if anything is wrong (e.g. `expected mode='production' got 'development'`, `expected >=9 manual sections, got 0`).

---

## 1. Visual / UX

### 1.1 Filter bar density - "More" collapse for low-frequency filters
- **Priority**: P2 - **Effort**: S
- **Files**: [frontend/src/components/FilterBar.tsx](../frontend/src/components/FilterBar.tsx)
- **Outline**: keep Model / Country / Supplier / Area / Outcome / Regime as primary chips; tuck tPeriod / Vetter / Tag / Dealer / Theme behind a `More filters` popover button. Reduces visual noise on small screens and stops the bar from wrapping awkwardly.

### 1.2 Loading skeletons per chart cell
- **Priority**: P3 - **Effort**: XS
- **Files**: [frontend/src/components/charts/ChartCard.tsx](../frontend/src/components/charts/ChartCard.tsx)
- **Outline**: currently a single full-card `Skeleton` shows when the query is loading. Replace with a chart-shaped skeleton (axes + grey bars) so the layout doesn't shift when data arrives.

### 1.3 Empty-state messaging for charts after filter wipes everything
- **Priority**: P2 - **Effort**: XS per chart
- **Files**: each `*Tab.tsx`
- **Outline**: if the data array passed to a chart is empty, render a centered "No claims match this filter" message instead of an empty Recharts canvas. Pattern already used in the per-vetter chart on RegimeTab; replicate everywhere.

### 1.4 KPI tile sparkline mini-trend
- **Priority**: P3 - **Effort**: S
- **Files**: [frontend/src/components/KpiTile.tsx](../frontend/src/components/KpiTile.tsx), [frontend/src/components/charts/Sparkline.tsx](../frontend/src/components/charts/Sparkline.tsx)
- **Outline**: each tile already takes a `range`; extend it to optionally take a `series: number[]` and render the existing `Sparkline` component underneath the big number. Wire from `kpis-monthly` (new endpoint - small aggregation).

### 1.5 Light theme toggle
- **Priority**: P3 - **Effort**: M
- **Files**: [frontend/src/index.css](../frontend/src/index.css), every tab's tooltip colour overrides
- **Outline**: Tailwind already has `darkMode: ['class']`. Add a toggle in the Navbar that flips the root `class="dark"` and uses Tailwind's `dark:` variants throughout. Most colours already use semantic tokens; the JCB yellow stays as the accent on both.

### 1.6 Mobile / tablet layout
- **Priority**: P3 - **Effort**: L
- **Files**: every page + filter bar
- **Outline**: the current layout assumes >= 1280 px. Add a `md:` breakpoint set that collapses multi-column grids to single column, stacks the filter bar vertically, and switches the navbar to a hamburger pattern. Charts will reflow because ResponsiveContainer already adapts.

### 1.7 Trend sparklines + deltas in the hero KPI tiles
- **Priority**: P2 - **Effort**: M (depends on 1.4)
- **Files**: [frontend/src/components/KpiTile.tsx](../frontend/src/components/KpiTile.tsx), [backend/src/routes/analytics.ts](../backend/src/routes/analytics.ts) (new `/kpis-monthly` endpoint)
- **Outline**: alongside the big number, show last-30-days vs prior-30-days delta and a sparkline. Already a documented pattern for "Top movers"; promote it to the headline KPI tiles too.

### 1.8 Tab persistence in URL
- **Priority**: P2 - **Effort**: XS
- **Files**: [frontend/src/pages/Dashboard.tsx](../frontend/src/pages/Dashboard.tsx)
- **Outline**: today `<Tabs defaultValue="overview">` resets to Overview on every refresh. Read/write the active tab in the URL hash or as a `tab=...` query param via `useSearchParams`. The filter bar already syncs URL state - extend the same pattern to the tab.

### 1.9 Print preview mode
- **Priority**: P3 - **Effort**: S
- **Files**: [frontend/src/pages/Report.tsx](../frontend/src/pages/Report.tsx)
- **Outline**: before clicking Print, let the user preview what the PDF will look like (apply print CSS classes on demand). Reduces frustration when sections page-break in unexpected places.

### 1.10 Saved filter presets in MongoDB (not localStorage)
- **Priority**: P3 - **Effort**: M
- **Files**: [backend/src/routes/](../backend/src/routes/) (new `presets.ts`), [frontend/src/components/FilterPresets.tsx](../frontend/src/components/FilterPresets.tsx)
- **Outline**: localStorage presets live in one browser only. Move to a `presets` Mongo collection with `name`, `filters`, `createdAt`. Backed by a small CRUD endpoint set so presets are shareable across users on the same instance.

### 1.11 Larger, dismissable claim modal (full-page mode)
- **Priority**: P3 - **Effort**: S
- **Files**: [frontend/src/components/ClaimModal.tsx](../frontend/src/components/ClaimModal.tsx)
- **Outline**: add a toggle in the modal header to "open in new tab" (`/claim/123`) so users can have multiple claims open side-by-side. Wire a small `/claim/:n` route in [App.tsx](../frontend/src/App.tsx).

### 1.12 Better description truncation banner placement
- **Priority**: P3 - **Effort**: XS
- **Files**: [frontend/src/pages/tabs/DataQualityTab.tsx](../frontend/src/pages/tabs/DataQualityTab.tsx)
- **Outline**: the truncation count is already on the DQ tab. Surface a small dismissable banner at the top of the dashboard when the count is >0, with a link to "open NLP tab".

---

## 2. Functional

### 2.1 Add `customer` as a global filter dimension
- **Priority**: P2 - **Effort**: S
- **Files**: [frontend/src/lib/api.ts](../frontend/src/lib/api.ts), [backend/src/services/filters.ts](../backend/src/services/filters.ts), [frontend/src/components/FilterBar.tsx](../frontend/src/components/FilterBar.tsx)
- **Outline**: add `customer?: string[]` to the Filters type, add the field mapping in backend filters builder, add a MultiSelect to the filter bar. Wire customer row clicks in [PeoplePlacesTab.tsx](../frontend/src/pages/tabs/PeoplePlacesTab.tsx) to add to it.

### 2.2 Add `asd` as a global filter dimension
- **Priority**: P3 - **Effort**: S
- **Files**: same as above
- **Outline**: same pattern. ASD has only 4 values (Assembly / Supplier Internal / Supplier External / Design) - a Select would do as well as a MultiSelect.

### 2.3 Add `detection` as a global filter dimension
- **Priority**: P3 - **Effort**: S
- Same pattern. Lets users filter to "only claims tagged Cannot Detect" or "only claims that escaped PDI" with one chip.

### 2.4 Keyboard shortcuts
- **Priority**: P3 - **Effort**: S
- **Files**: [frontend/src/pages/Dashboard.tsx](../frontend/src/pages/Dashboard.tsx)
- **Outline**: `1`..`9` to switch tabs, `/` to focus search, `r` to reset filters, `?` to open a keyboard-shortcut overlay. Add via a single `useEffect` with a global `keydown` listener.

### 2.5 Compare mode (filter A vs filter B side-by-side)
- **Priority**: P3 - **Effort**: L
- **Files**: most tabs would need a `compareFilters?` prop
- **Outline**: split the screen vertically; the left side renders charts for filter A, the right side for filter B. Lets users compare e.g. UK vs USA, or 540V140 vs 540V180.

### 2.6 Bulk-action toolbar on the claims grid
- **Priority**: P3 - **Effort**: M
- **Files**: [frontend/src/pages/tabs/DataQualityTab.tsx](../frontend/src/pages/tabs/DataQualityTab.tsx)
- **Outline**: select multiple rows -> bulk-tag / bulk-add-to-watchlist / bulk-export. Requires multi-select state + a server-side `POST /api/claims/bulk` endpoint.

### 2.7 Column-click sort on the claims grid
- **Priority**: P3 - **Effort**: XS
- **Files**: same
- **Outline**: the backend already accepts `sort` + `order`; the grid just doesn't expose it. Add `<th onClick>` to toggle sort direction.

### 2.8 In-app tour overlay (one per page)
- **Priority**: P3 - **Effort**: M
- **Files**: new `frontend/src/components/Tour.tsx` + a tour.json fixture
- **Outline**: highlight each widget with a step-by-step overlay explaining what to look for. Tied to a 'Help / Tour' button in the navbar. Use a tiny library (Shepherd.js or react-joyride) or hand-roll with absolute-positioned divs.

### 2.9 Hours-bucket slider on Outcome Drivers (expose `minN`)
- **Priority**: P3 - **Effort**: XS
- **Files**: [frontend/src/pages/tabs/DriversTab.tsx](../frontend/src/pages/tabs/DriversTab.tsx)
- **Outline**: today the `minN=30` cutoff is hard-coded. Add a slider (10 / 30 / 100 / 500) so users can include niche-but-real values.

### 2.10 Cross-filter for chart bars on every tab
- **Priority**: P2 - **Effort**: S
- **Files**: each tab's `<Bar onClick={...}>` Recharts handlers
- **Outline**: Overview now does it. Replicate the same `setFilters` pattern across remaining bar charts: Reliability hours histogram (-> hoursBucket filter), People & Places country bars (already done), Operations DoW/MoY (could filter by date band).

### 2.11 Persist last-uploaded filename + size in Admin
- **Priority**: P3 - **Effort**: XS
- **Files**: [frontend/src/pages/Admin.tsx](../frontend/src/pages/Admin.tsx)
- **Outline**: already in `uploads` collection. Surface "last successful ingest at YYYY-MM-DD HH:MM" prominently above the drop zone so users can see freshness.

---

## 3. Data insights (deeper analytics, all rule-based)

### 3.1 Calendar heatmap of daily claim activity (last 365 days)
- **Priority**: P2 - **Effort**: M
- **Files**: new `/api/analytics/calendar-heatmap` endpoint + `CalendarHeatmap` component
- **Outline**: GitHub-style daily heatmap. 365 cells, each is a day, brightness = claim count. Surface seasonality at a sub-monthly resolution.

### 3.2 Geographic choropleth world map
- **Priority**: P2 - **Effort**: M
- **Files**: new `WorldChoropleth` component using a topojson layer (one-off file in `/public`)
- **Outline**: replace or supplement the Top countries horizontal bar with a colour-coded world map. No internet needed; ship the topojson locally. Reuse the existing `/by-country` endpoint.

### 3.3 Sankey: Build area -> Failed part -> Outcome
- **Priority**: P2 - **Effort**: L
- **Files**: new `/api/analytics/sankey` endpoint + a Sankey chart component (Recharts has one)
- **Outline**: 3-tier flow diagram for storytelling. Pick top N at each tier; thicker bands = more flow. Use the existing `claims` data with three `$group` stages.

### 3.4 Tag chord diagram for co-occurrence
- **Priority**: P3 - **Effort**: M
- **Files**: extend `/tag-cooccurrence` to return a matrix; use d3-chord
- **Outline**: visualises strong tag pairs as a chord plot. Existing pair counts feed it directly.

### 3.5 Z-score anomaly auto-flagger on the build heatmap
- **Priority**: P2 - **Effort**: S
- **Files**: [frontend/src/pages/tabs/BuildTab.tsx](../frontend/src/pages/tabs/BuildTab.tsx) heatmap rendering
- **Outline**: compute mean + sd of all cells (already in scope client-side). Cells > 2sd above mean get a small red dot + tooltip "+2.3sd above mean". Trivial enhancement to existing heatmap.

### 3.6 Cohort retention curve per model family
- **Priority**: P3 - **Effort**: M
- **Files**: new `/api/analytics/cohort-retention` endpoint
- **Outline**: for each build-month cohort, plot the cumulative `% of machines that have claimed by month X after build`. Lets engineering see how a quality issue manifests over time after a build batch.

### 3.7 Kaplan-Meier survival curves per model
- **Priority**: P3 - **Effort**: M
- **Files**: new `/api/analytics/survival` endpoint
- **Outline**: classic survival analysis using `buildDate -> failDate`. Curves descend over time, censored at the data cut-off. Deterministic one-pass algorithm; no ML needed.

### 3.8 Failure-mode clustering (rule-based)
- **Priority**: P3 - **Effort**: M
- **Files**: new endpoint
- **Outline**: group claims by `(area, theme, top-1 tag)` tuples; surface tuples with > N occurrences as "failure modes". Each cluster has a representative claim list.

### 3.9 Recurrence prediction (rule-based, no model)
- **Priority**: P2 - **Effort**: S
- **Files**: extend `/api/analytics/serial-recidivism`
- **Outline**: for each machine with >= 3 claims, compute days-since-last-claim. Machines with > 12-month gap and 3+ historical claims get flagged "likely to claim again". Push to People & Places as a separate column.

### 3.10 Cost-proxy ranking
- **Priority**: P2 - **Effort**: S
- **Files**: new `/api/analytics/cost-proxy` endpoint
- **Outline**: since the source CSV has no cost field, rank parts by `count * (1 + DOA_share + reject_share)`. Surfaces highest-impact targets the team can act on without waiting for cost data to be added upstream.

### 3.11 Per-claim "Why was this rejected?" narrative
- **Priority**: P3 - **Effort**: M
- **Files**: [frontend/src/components/ClaimModal.tsx](../frontend/src/components/ClaimModal.tsx)
- **Outline**: in the claim modal, render a one-paragraph templated narrative based on the claim's own fields: `"Rejected. Area was {area} with theme {theme}. Vetter notes mention {top vetter-note token}. Supplier {supplier} has a {rejectRate*100}% reject rate in the current filter."` Pure template interpolation - **no LLM**.

### 3.12 Auto-suggested tags
- **Priority**: P3 - **Effort**: S
- **Files**: new `/api/admin/tag-suggestions` endpoint + a card on the Admin page
- **Outline**: after an ingest, find bigrams that appear > 50 times in `descriptionBigrams` but aren't yet in the controlled vocab `TAG_RULES`. Show them on Admin -> "add as tag?". Adding requires a code commit (regex literal), then `POST /api/admin/recompute` to re-tag existing rows.

### 3.13 Theme integrity auto-fix at ingest
- **Priority**: P2 - **Effort**: XS
- **Files**: [backend/src/services/ingest.ts](../backend/src/services/ingest.ts)
- **Outline**: when `theme IN ('Z Code', 'Z Coded', 'Z-Code', 'Accept', 'Reject')` at ingest, normalise to `'Unknown'` and store the original in a new `themeOriginal` field. Surfaces the problem without persistently polluting the theme dimension.

### 3.14 Forecasting via SARIMA / linear projection (deterministic)
- **Priority**: P3 - **Effort**: L
- **Files**: `scripts/forecast.py` + a new `/api/analytics/forecast` endpoint
- **Outline**: simple SARIMA on monthly claim volume per model family. Outputs `next-6-months expected count + 80 % prediction interval`. Saved to a small Mongo collection that the frontend reads. Pure stats; no AI.

### 3.15 Movers period selector + side-by-side delta comparison
- **Priority**: P3 - **Effort**: S
- **Files**: [frontend/src/pages/tabs/OverviewTab.tsx](../frontend/src/pages/tabs/OverviewTab.tsx)
- **Outline**: let the user pick the comparison window (30 / 60 / 90 / 180 days) instead of the hard-coded 90.

---

## 4. Performance

### 4.1 Code-split the dashboard tabs with React.lazy
- **Priority**: P2 - **Effort**: S
- **Files**: [frontend/src/pages/Dashboard.tsx](../frontend/src/pages/Dashboard.tsx)
- **Outline**: today every tab's code is in the initial 1.1 MB bundle. Wrap each tab import with `React.lazy(() => import('./tabs/XxxTab'))` and `<Suspense fallback={...}>`. Brings initial bundle to <300 KB.

### 4.2 Server-side LRU cache for analytics endpoints
- **Priority**: P3 - **Effort**: S
- **Files**: [backend/src/routes/analytics.ts](../backend/src/routes/analytics.ts) (one middleware)
- **Outline**: add `lru-cache` keyed by `(endpoint, JSON.stringify(query))` with 5 min TTL. Aggregation queries are expensive and the same filters get re-requested as users tab around.

### 4.3 Mongo aggregation pipeline review
- **Priority**: P3 - **Effort**: M
- **Files**: [backend/src/routes/analytics.ts](../backend/src/routes/analytics.ts)
- **Outline**: profile the slowest endpoints with `explain`. Likely candidates: `/tag-cooccurrence`, `/serial-recidivism`, `/outcome-drivers` with `dim=tag`. Consider materialised views in a `claims_daily` collection that the ingest writes alongside `claims`.

### 4.4 Lazy-load Recharts only when needed
- **Priority**: P3 - **Effort**: XS
- **Files**: each tab
- **Outline**: import the specific Recharts components rather than the umbrella module. Already done in most files; double-check Drivers / NLP.

### 4.5 Bundle analyser pass
- **Priority**: P3 - **Effort**: XS
- **Outline**: add `vite-bundle-visualizer` as a dev dep and produce a treemap on each build. Identify the top 5 biggest packages and decide whether to keep them.

---

## 5. Operations

### 5.1 Weekly auto-report via Task Scheduler
- **Priority**: P2 - **Effort**: S
- **Files**: new `scripts/weekly.bat` + a tiny PowerShell scheduled task command
- **Outline**: every Monday 06:00, run `python scripts/report.py` and copy the resulting `REPORT.md` into a dated `archives/REPORT-YYYY-MM-DD.md`. Lets management read a fresh snapshot every Monday.

### 5.2 Excel multi-sheet export
- **Priority**: P3 - **Effort**: M
- **Files**: new `/api/export/xlsx` endpoint
- **Outline**: use `exceljs` to produce a workbook with one sheet per analytical view (Overview KPIs / Pareto / Vetter scorecard / Drivers / Suppliers / People). Useful for downstream Excel-based reporting.

### 5.3 Optional shared-password gate on /admin and /api/upload
- **Priority**: P3 - **Effort**: S
- **Files**: backend middleware + Admin page
- **Outline**: opt-in via env var (`WTY_ADMIN_PASSWORD`). When set, every POST to `/api/upload` / `/api/admin/*` checks an HTTP header. Admin page asks for the password on first visit and stores it in `sessionStorage`.

### 5.4 Audit log of uploads + filter usage
- **Priority**: P3 - **Effort**: S
- **Files**: new `events` collection + middleware
- **Outline**: log every upload, every filter change (debounced), every claim modal open. Surface in Admin -> "Recent activity". Helpful for incident response and "who looked at what".

### 5.5 Health-check endpoint with Mongo round-trip + freshness
- **Priority**: P3 - **Effort**: XS
- **Files**: [backend/src/index.ts](../backend/src/index.ts)
- **Outline**: extend `/api/health` to return `{ok, mongoMs, lastIngestAt, claimCount}`. Lets Ops monitor with a single GET.

### 5.6 Print/PDF logo + page numbers + JCB header
- **Priority**: P3 - **Effort**: S
- **Files**: [frontend/src/index.css](../frontend/src/index.css)
- **Outline**: extend `@page` with `margin-box: top-left` running a header, `bottom-right` running a page counter. Adds professional polish to printed reports.

### 5.7 Pre-commit hook to mirror root README/REPORT into docs/
- **Priority**: P3 - **Effort**: XS
- **Files**: `.husky/pre-commit` or simple Node script
- **Outline**: auto-copy `README.md` -> `docs/README.md` and `REPORT.md` -> `docs/REPORT.md` so the two are always in sync.

### 5.8 Server-side PDF via Puppeteer (true one-click)
- **Priority**: P3 - **Effort**: L
- **Files**: backend (would add `puppeteer` dep ~300 MB Chromium)
- **Outline**: an alternative to browser print. Useful if you want to email the PDF as an attachment automatically. Caution: large dependency, only add if scheduled emails are required.

---

## 6. Documentation / onboarding

### 6.1 Glossary doc
- **Priority**: P3 - **Effort**: S
- **Files**: new `docs/GLOSSARY.md`
- **Outline**: define every term the user encounters: DOA, T000-T006, regime, vetting, ASD, "Z Code", PDI, UV, SIP, "Cannot Detect", description tag, regime line. Cross-link from each page doc.

### 6.2 Onboarding checklist for new vetters
- **Priority**: P3 - **Effort**: S
- **Files**: new `docs/ONBOARDING.md`
- **Outline**: "On your first morning: 1. open Dashboard. 2. Look at the headline cards. 3. Check your name on the Vetter scorecard...".

### 6.3 Inline tooltips for each filter chip
- **Priority**: P3 - **Effort**: XS
- **Files**: [frontend/src/components/MultiSelect.tsx](../frontend/src/components/MultiSelect.tsx)
- **Outline**: hover any filter chip to see "What is this?" with a short definition and an example value.

### 6.4 Architecture diagram
- **Priority**: P3 - **Effort**: XS
- **Files**: extend root [README.md](../README.md) section 3
- **Outline**: already has a Mermaid diagram. Add a second showing the data flow at ingest (CSV -> parse -> clean -> NLP -> upsert -> index).

---

## 7. Security (only if the deployment ever leaves the workstation)

### 7.1 Rate-limit + CSRF on /api/upload
- **Priority**: P3 - **Effort**: S
- **Files**: backend middleware
- **Outline**: add `express-rate-limit` for `/api/upload`, set a per-IP cap (10 uploads/hour). CSRF token via a hidden field if going through a non-trusted form post.

### 7.2 Username/password auth via Passport.js + bcrypt
- **Priority**: P3 - **Effort**: L
- **Files**: new auth router + Mongo `users` collection
- **Outline**: only needed if multiple users on the same instance. Login via Passport local strategy. Session in cookie. Skip for single-user / shared-machine deployments.

### 7.3 HTTPS termination at a reverse proxy
- **Priority**: P3 - **Effort**: XS
- **Outline**: out of scope of the app. Document recommended setup (Caddy or nginx in front of Express) in [README.md](../README.md).

---

## 8. Out of scope (call out explicitly)

The following items are intentionally **not** on the roadmap because they would either break the AI-free posture or require source-system changes:

- **LLM-generated narratives** of any kind. The narrative pipeline is rule-based and stays that way.
- **Predictive ML models** (gradient-boosted likelihood-of-reject classifiers, embedding-based outlier detection). The "predictions" already in scope (recurrence flag, cost proxy ranking, forecasting) are deterministic algorithms, not models.
- **Cost field in the dashboard.** Source CSV does not include one. Until upstream adds it, all £-based widgets are intentionally absent.
- **Mandatory `claimDate` / `failDate`.** Upstream-system change request, not in our control.
- **600-char description cap.** Same - source-system field length.
- **Real-time streaming from the production warranty system.** Currently batch-via-CSV. Streaming would require a different ingest design.

---

## Implementation order suggestion

If sequencing the next sprint, the highest-value combo of "low effort + high impact":

1. **2.1** Customer filter chip (S, unlocks customer cross-filtering everywhere)
2. **1.8** Tab persistence in URL (XS, immediate UX win)
3. **3.13** Theme integrity auto-fix at ingest (XS, fixes a real data-quality issue)
4. **5.1** Weekly auto-report (S, gives management a Monday-morning summary)
5. **4.1** Tab code-splitting (S, halves initial load)
6. **3.5** Z-score anomaly flags on the build heatmap (S, surfaces batch incidents automatically)
7. **3.9** Recurrence prediction column (S, surfaces problem machines)
8. **3.2** Geographic choropleth (M, dramatic visual upgrade)
9. **3.1** Calendar heatmap (M, adds seasonality lens)
10. **3.3** Sankey diagram (L, storytelling chart for stakeholders)

That sequence delivers two cross-cutting fixes (filter coverage + tab state), a real data-quality improvement, a recurring operational benefit, a performance win, two automatic-insight enhancements, and three new visual lenses.
