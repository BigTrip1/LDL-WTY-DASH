# Page 9 - People & Places

## Purpose
Surface the dealers, customers, countries, and individual machines (serial numbers) that drive the most claims. The single most actionable insight on this page is the recidivism leaderboard: machines that have racked up many claims and may be candidates for site visit, fleet review, or buy-back.

Primary user: warranty manager + dealer/customer relations.

## Layout map

```
+-----------------------------------------------------------------------------+
| Sticky header                                                               |
+-----------------------------------------------------------------------------+
| Row 1 (4-col)                                                               |
|   Unique serials | Serials >=2 | Serials >=5 | Serials >=10                 |
+-----------------------------------------------------------------------------+
| Row 2 (full-width)                                                          |
|   Repeat-offender machines (>=5 claims) - top 60                            |
|   Serial click -> open latest claim modal (with related-serial panel)      |
|   Model / Dealer / Country click -> add to global filter                   |
+-----------------------------------------------------------------------------+
| Row 3 (2-col)                                                               |
|   Dealer scorecard (top 50 by volume)  |  Customer scorecard (top 40)       |
+-----------------------------------------------------------------------------+
| Row 4 (full-width)                                                          |
|   Country reject-rate league (n >= 200), sorted ascending by accept rate    |
+-----------------------------------------------------------------------------+
```

## Widget catalogue

### Summary stat tiles
- **Source**: `/api/analytics/serial-recidivism?minClaims=5&limit=60` -> `summary` object.
- Tiles show total unique serials, and how many have `>=2`, `>=5`, `>=10` claims. Each repeat tile also shows the % of unique serials it represents.

### Repeat-offender machines (table)
- **Source**: same endpoint -> `rows`.
- **Formula**: `count(*) GROUP BY serial HAVING count >= 5`, plus first-seen build/vetted dates and outcome counts.
- **Columns**: Serial / Claims / Model / Dealer / Country / First built / First vetted / Last vetted / Reject / Z-Code / Accept.
- **Drill-down**:
  - **Serial click** -> opens the most-recent claim for that serial in the modal, with a "Other claims on serial X" panel showing every related claim.
  - **Model click** -> adds the model to the global filter.
  - **Dealer click** -> adds the dealer to the global filter.
  - **Country click** -> adds the country to the global filter.
- **Reading**: any serial with > 10 claims is a candidate for site visit / customer call / buy-back conversation.

### Dealer scorecard (table)
- **Source**: `/api/analytics/by-dealer?limit=50`.
- **Columns**: Dealer / Claims / Countries / Reject / Z-Code / Accept.
- **Reading**: Reject badge red >15 %, amber 7-15 %, green <7 %. Accept badge red <70 %, amber 70-85 %, green >85 %. "Countries" = how many distinct destination markets this dealer ships to.
- **Drill-down**: row click adds dealer to the global filter.

### Customer scorecard (table)
- **Source**: `/api/analytics/by-customer?limit=40`.
- **Filter**: excludes the `#` placeholder (stock / no customer assigned).
- **Reading**: rental fleets (Ardent, Equipment Share, United Rentals, Sunbelt) typically dominate the top of this list.
- **Drill-down**: customer is not currently a global-filter dimension. Improvement candidate.

### Country reject-rate league
- **Source**: `/api/analytics/by-country` (filtered client-side to `n >= 200`).
- **Sort**: ascending by accept rate, so the most-rejected markets surface first.
- **Reading**: a non-UK country at the top with a sub-80 % accept rate is worth investigating - either genuine market issues, or vetter bias against non-UK claims (which is a separate fairness conversation).
- **Drill-down**: country click adds to the global filter.

## Cross-filter behaviour
- Global filter narrows every endpoint.
- Click handlers on this page that update the global filter:
  - Serial -> opens claim modal (not filter)
  - Model / Dealer / Country (in any table) -> adds to filter
- Customer column has no click handler (no global `customer` filter exists).

## Common interpretations
1. **Top serial has 21+ claims** = the machine is a problem child. Open it and read every claim's description; pattern usually reveals the root cause (often a single component).
2. **45 % of unique serials have >= 2 claims** = recidivism is the norm, not the exception. Population of "problem machines" is large.
3. **A dealer at the top of the volume column with a high reject rate** = either claim quality issues (poor diagnostics) or claim culture (over-submission). Dealer engagement candidate.
4. **A rental fleet customer with > 20 % reject rate** = likely volume of speculative claims; consider a service-quality conversation.
5. **A non-UK country with <70 % accept rate** = drill into their specific claims and compare with the equivalent UK pattern. Cross-check the vetter scorecard too in case one vetter handles the bulk of that market's claims.

## Known limitations
- The customer scorecard isn't click-to-filter because the global Filters type doesn't include `customer`. Adding it is an improvement candidate.
- Repeat-offender table is limited to top 60 by claim count. To pull the long tail, use the API directly with a higher `limit` param.
- "Country" here is `country` (destination), not always the country where the claim was filed - same caveat as elsewhere.
