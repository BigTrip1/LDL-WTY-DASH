# 7. Admin · uploading data + custom filter groups

The **Admin** route is where new `claims.csv` files are loaded **and** where custom filter groups are managed.

## Walkthrough

1. Click **Admin** in the top nav.
2. Drag the new `claims.csv` onto the drop zone (or click to pick a file).
3. Click **Ingest CSV**.
4. Watch the progress bar (typical 24 k row file takes ~11 seconds).
5. When done, the result card shows:
   - **received** — rows in the CSV
   - **inserted** — new claims added (by `claimNumber`)
   - **skipped (dupes)** — rows whose `claimNumber` was already in the database
   - **parse errors** — rows that couldn't be parsed (full error message shown for the first 10)
   - **duration**
6. The upload appears in the **Upload history** table below.

## How dedupe works

The ingest does `bulkWrite({updateOne: {filter: {_id: claimNumber}, update: {$setOnInsert: doc}, upsert: true}})`. That means:

- If the `claimNumber` is **new**, the row is inserted.
- If the `claimNumber` is **already in the database**, the existing row is left untouched and the new row is counted in `skipped (dupes)`.

So re-uploading a CSV that contains some old rows plus some new ones will only add the new ones — exactly what you want.

## What the ingest pipeline does to each row

1. **Parses dates** from `DD/MM/YYYY` to `Date` (claimDate / failDate / buildDate / vetted_date).
2. **Cleans hours**: `'#'` placeholders → null, values > 20,000 or < 0 → null.
3. **Normalises empty categorical fields** to `'Unknown'` (area / asd / detection / theme).
4. **Derives the part code** from `failedPart` (`split('-')[0]`).
5. **Computes `hoursBucket`** (0-50, 50-250, etc.) and `buildToFailDays`.
6. **Runs NLP enrichment** on the description: tokenises, removes stop-words, generates bigrams, applies the controlled-vocab tag regex (`oil-leak`, `valve`, `hose`, `loose`, `travel-site`, etc.).
7. **Tags the regime** from `vetted_date` (`pre-2025` / `post-2025` / `unvetted`).
8. **Auto-fixes theme** if a vetter typed an outcome value (`Z Coded`, etc.): preserves the original in `themeOriginal` and sets `theme` to `Unknown` so the dimension stays clean.

## What to do when an upload fails

- **`parse errors > 0`**: open the first few error messages in the result card. Common cause: a row has a malformed claim number or a date that doesn't match the expected format. Fix in the source CSV and re-upload — duplicates will be skipped automatically.
- **`inserted = 0`** with a full file: the upload succeeded but every row was a duplicate. Either the file is identical to a previous upload, or the source system isn't generating new claim numbers.
- **Network / 500 error**: backend is down or Mongo isn't running. Check the backend terminal for errors, or run `scripts/audit-no-ai.bat` to confirm the source is healthy.
- **File too big**: the multipart limit is 200 MB. Split the file or contact the operator.

## Filter groups (one-click filter shortcuts)

Below the upload section is a **Filter groups** block. It lets you bundle multiple values from any filter dimension into a single named chip that appears in the dashboard filter dropdown.

### Why bother?

Example: you regularly want to look at only the agricultural models. Instead of opening the Model dropdown and ticking 40+ specific SKUs every time, create a group **once**:

1. In the **Filter groups** card, pick the **Model** dimension (top of the card).
2. On the right ("Create new group · Model"), type a name like `Ag`.
3. Search and tick every Ag-relevant SKU (use **Select all (filtered)** after typing "AG" to bulk-select).
4. Click **Save group**.
5. Done — open the Model filter dropdown on any dashboard tab and you'll see an **`Ag`** pill at the top. One click applies all the SKUs at once.

### Pill states

In the dashboard filter dropdown, each group pill is one of three colours:
- **Outline** = none of the group's members are currently selected.
- **Yellow-tinted** = partial — some but not all of the group's members are selected.
- **Solid yellow** = full — every member of the group is selected. Clicking again removes them all.

### Available dimensions

Any of the 11 filter dimensions can have groups: Model, Country, Supplier, Area, tPeriod, Outcome, Dealer, Vetter, Theme, Customer, Tag.

### Editing & deleting

In the **Existing groups** column on the left:
- The pencil icon opens the group for editing — change name or value set, then **Save**.
- The trash icon deletes the group (confirms first). The underlying values are untouched — only the named bundle is removed.

Names must be unique **within a dimension** (you can't have two "Ag" groups under Model). The same name CAN be reused across dimensions (e.g. "EU" for both Country and Customer if you want).

### Where the groups live

Groups are stored in the `filter_groups` MongoDB collection on the same database as the claims data. They're shared by every user on the local network — when one warranty manager creates a group, everyone else sees it the next time they open the dashboard.

## Notes

- The CSV must have the exact column names the system expects (see [`docs/pages/10-data-quality.md`](../pages/10-data-quality.md) for the column dictionary).
- The system tolerates **trailing whitespace** in column names (e.g. the `hours ` column with the trailing space is renamed to `hours` automatically).
- The system **does not** modify the source CSV — the file you drop is parsed and discarded after ingest.

## After uploading

- The dashboard updates immediately — open any tab to see the new data.
- Re-run `scripts/report.py` (or `scripts/weekly.bat`) to regenerate `REPORT.md` with the new data.
- The **Recompute** button in the top date strip re-derives NLP / regime / hoursBucket on every existing row. Useful if you've changed the tag dictionary or the regime date — not needed after a simple data upload.
