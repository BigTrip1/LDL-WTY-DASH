import { Router } from 'express';
import { Claim } from '../models/Claim.js';
import { TAG_VOCABULARY } from '../services/nlp.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [
    models, countries, suppliers, areas, tPeriods, outcomes, dealers, vetters, themes,
    // Top customers by claim count - the field has ~5,000 distinct values, too many for
    // a dropdown, so we cap at the 200 most-active and skip the '#' / '' placeholders.
    customersTop
  ] = await Promise.all([
    // The 'model' filter chip uses the `model` field (variant SKU like
    // '535V125') rather than `machineModel` (the broader family code).
    Claim.distinct('model'),
    Claim.distinct('country'),
    Claim.distinct('partSupplier'),
    Claim.distinct('area'),
    Claim.distinct('tPeriod'),
    Claim.distinct('claimOutcome'),
    Claim.distinct('dealer'),
    Claim.distinct('vettedBy'),
    Claim.distinct('theme'),
    Claim.aggregate([
      { $match: { customer: { $nin: ['', '#'] } } },
      { $group: { _id: '$customer', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 200 }
    ])
  ]);
  const dateRange = await Claim.aggregate([
    { $group: {
        _id: null,
        minBuild: { $min: '$buildDate' },
        maxBuild: { $max: '$buildDate' },
        minVetted: { $min: '$vettedDate' },
        maxVetted: { $max: '$vettedDate' }
      } }
  ]);
  res.json({
    models: models.filter(Boolean).sort(),
    countries: countries.filter(Boolean).sort(),
    suppliers: suppliers.filter(Boolean).sort(),
    areas: areas.filter(Boolean).sort(),
    tPeriods: tPeriods.filter(Boolean).sort(),
    outcomes: outcomes.filter(Boolean).sort(),
    dealers: dealers.filter(Boolean).sort(),
    vetters: vetters.filter(Boolean).sort(),
    themes: themes.filter(Boolean).sort(),
    customers: customersTop.map((r: any) => r._id).filter(Boolean),
    tags: TAG_VOCABULARY,
    dateRange: dateRange[0] || null
  });
});

export default router;
