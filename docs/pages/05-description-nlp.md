# Page 5 - Description NLP

## Purpose
Mine the free-text claim descriptions for symptom themes. Without an LLM, all NLP is done by deterministic rules at ingest time: tokenise + stop-word filter, generate bigrams, apply a regex-driven controlled-vocab tagger (oil-leak, valve, hose, loose, travel-site, etc.). This page lets a vetter or engineer search those symptoms, watch them trend, and see which tags co-occur.

Primary user: reliability engineer trying to understand what customers are actually saying when machines fail.

## Layout map

```
+-----------------------------------------------------------------------------+
| Sticky header                                                               |
+-----------------------------------------------------------------------------+
| (Optional banner) "N claims at the 600-char truncation cap"                 |
+-----------------------------------------------------------------------------+
| Row 1 (3-col 2:1)                                                           |
|   Description tag cloud (click-to-select)  |  Tag frequency bar chart       |
+-----------------------------------------------------------------------------+
| Row 2 (3-col 1:2)                                                           |
|   Top n-grams tabs (Unigrams / Bigrams)    |  Tag trend (selected tags)     |
+-----------------------------------------------------------------------------+
| Row 3 (3-col 2:1)                                                           |
|   Tag co-occurrence (top 15 pairs)         |  Vetter notes - top tokens     |
+-----------------------------------------------------------------------------+
| Row 4 (full-width)                                                          |
|   Free-text claim search (Mongo text-index)                                 |
+-----------------------------------------------------------------------------+
```

## Widget catalogue

### Description-truncation banner (conditional)
- Appears only when `descTruncated > 0` (where `descTruncated = count(length(description) >= 600)`).
- The source CSV caps the description field at 600 chars. Bigram and unigram counts on those rows are partial.

### Description tag cloud
- **Source**: `/api/analytics/description-tags`.
- **Formula**: `count(*) GROUP BY descriptionTags` (multikey unwind). Tags are produced at ingest by a controlled-vocab regex dictionary in [backend/src/services/nlp.ts](../../backend/src/services/nlp.ts).
- **Reading**: word size proportional to claim count. Tags are clickable - active tags get the yellow highlight; clicked tags also appear in the Tag trend chart below.
- **Drill-down**: click a tag -> adds to the local selection used by Tag trend.

### Tag frequency (bar chart)
- Same source as the cloud, but rendered as a sortable horizontal bar chart. Useful when you want exact rank comparison rather than rough size.

### Top n-grams (tabs: Unigrams / Bigrams)
- **Source**: `/api/analytics/description-ngrams?n=1|2&limit=60`.
- **Formula**: at ingest, descriptions are lowercased, stripped of punctuation, split into tokens, stop-words removed, length < 3 dropped. Tokens stored as `descriptionTokens[]`; adjacent pairs stored as `descriptionBigrams[]`. The endpoint unwinds + groups + sorts.
- **Reading**: top tokens / bigrams across all descriptions in the current filter. Watch for emergent technical phrases like "valve block" or "oil leaking".

### Tag trend (selected tags)
- **Source**: `/api/analytics/description-trend?tags=...`.
- **Formula**: monthly count of claims containing each selected tag.
- **Reading**: one line per selected tag, Jan-2025 regime line overlaid. Use to spot when a symptom started climbing (often correlates with a supplier change or a build batch).
- **Drill-down**: tag clicks come from the tag cloud above.

### Tag co-occurrence (top 15 pairs)
- **Source**: `/api/analytics/tag-cooccurrence?topN=15`.
- **Formula**: among claims with two or more tags, count unordered pairs of tags from the top 15. Implemented server-side via `$reduce` + `$map`.
- **Reading**: pairs that co-occur frequently reveal system-level interactions. Classic examples: `oil-leak` + `hose` + `loose` always cluster; `error-code` + `harness` often together; `vibration` + `boom` + `wear-pad` cluster.

### Vetter notes - top tokens
- **Source**: `/api/analytics/by-vettersnotes`.
- **Formula**: on demand (no pre-indexed tokens). The endpoint samples the most-recent 8 k rows by `vettedDate`, tokenises `vettersNotes`, strips stop-words, ranks by count.
- **Reading**: surfaces vetter-side language. Common tokens like "replaced", "tested", "machine", "site" reflect the workflow they describe.

### Free-text claim search
- **Source**: `/api/analytics/description-search?q=...`.
- **Formula**: uses the Mongo text index on `description` with `$meta:"textScore"` sorted descending.
- **Reading**: enter a query (e.g. `boom shimming`). Returns up to 25 most-relevant claims with description excerpts + tags + outcome. Click any row to open the claim detail modal.
- **Drill-down**: row click -> claim modal.

## Cross-filter behaviour
- Global filter narrows every endpoint (e.g. setting `model = 540V140` reduces the tags to only that model's claims).
- Tag cloud / Tag frequency clicks are local to this page (they update the Tag trend chart, not the global filter). For dashboard-wide filtering by tag, use the `Tag` chip in the global filter bar.

## Common interpretations
1. **`oil-leak` and `valve` co-occurrence at 2 500+** = the dominant hydraulic-system fault family.
2. **`travel-site` appearing 2 000+ times** = a costly category of warranty travel; review whether some of these claims could have been resolved remotely.
3. **Tag trend for `oil-leak` rises in months after a supplier change** = suspect a regressed component lot.
4. **A new bigram appears in the top 30 that wasn't there before** = an emerging issue worth investigating.
5. **Vetter notes top tokens dominated by "replaced" and "tested"** = consistent with the team's standard remediation language; outliers (e.g. "shimmed", "calibrated") might mark a special case.

## Known limitations
- Source descriptions are truncated at 600 chars - bigram counts on those rows are partial. The banner appears when any are present.
- The controlled-vocab tagger covers ~40 symptom tags but is not exhaustive. Adding tags = adding a regex in [backend/src/services/nlp.ts](../../backend/src/services/nlp.ts) and running `POST /api/admin/recompute` to re-tag existing docs.
- Vetter notes mining is on-demand (no index), so it samples 8k rows; tweak in [analytics.ts](../../backend/src/routes/analytics.ts) if a wider window is needed.
- Search results are limited to 25 rows; for bulk export use the Data Quality tab's CSV download.
