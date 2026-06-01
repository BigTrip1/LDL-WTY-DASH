import { Router } from 'express';
import { Claim } from '../models/Claim.js';
import { buildMatch } from '../services/filters.js';
import { REGIME_DATE } from '../utils/dates.js';

const router = Router();

const ACCEPT_DENOM = { $cond: [{ $ne: ['$claimOutcome', null] }, 1, 0] };
const IS_ACCEPT = { $cond: [{ $eq: ['$claimOutcome', 'Accept'] }, 1, 0] };
const IS_REJECT = { $cond: [{ $eq: ['$claimOutcome', 'Reject'] }, 1, 0] };
const IS_ZCODE = { $cond: [{ $eq: ['$claimOutcome', 'Z Code'] }, 1, 0] };
const IS_MOREINFO = { $cond: [{ $eq: ['$claimOutcome', 'More Info'] }, 1, 0] };
const IS_RAISE = { $cond: [{ $eq: ['$claimOutcome', 'Raise on Supplier'] }, 1, 0] };
const IS_DOA = { $cond: [{ $eq: ['$tPeriod', 'DOA'] }, 1, 0] };
const IS_T1 = { $cond: [{ $in: ['$tPeriod', ['T000', 'T001']] }, 1, 0] };
const IS_T3 = { $cond: [{ $in: ['$tPeriod', ['T002', 'T003']] }, 1, 0] };
const IS_T6 = { $cond: [{ $in: ['$tPeriod', ['T004', 'T005', 'T006']] }, 1, 0] };

function cohortTPeriodRatesFields() {
  return {
    doaRate: { $cond: [{ $gt: ['$n', 0] }, { $divide: ['$doa', '$n'] }, 0] },
    t1Rate: { $cond: [{ $gt: ['$n', 0] }, { $divide: ['$t1', '$n'] }, 0] },
    t3Rate: { $cond: [{ $gt: ['$n', 0] }, { $divide: ['$t3', '$n'] }, 0] },
    t6Rate: { $cond: [{ $gt: ['$n', 0] }, { $divide: ['$t6', '$n'] }, 0] },
    acceptRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$accept', '$vetted'] }, 0] }
  };
}

async function aggregateMonthlyCohort(
  match: Record<string, unknown>,
  dateField: 'buildDate' | 'vettedDate'
) {
  const dateMatch = {
    ...match,
    [dateField]: { $ne: null }
  };
  const rows = await Claim.aggregate([
    { $match: dateMatch },
    {
      $group: {
        _id: { $dateTrunc: { date: `$${dateField}`, unit: 'month' } },
        n: { $sum: 1 },
        doa: { $sum: IS_DOA },
        t1: { $sum: IS_T1 },
        t3: { $sum: IS_T3 },
        t6: { $sum: IS_T6 },
        reject: { $sum: IS_REJECT },
        accept: { $sum: IS_ACCEPT },
        vetted: { $sum: ACCEPT_DENOM }
      }
    },
    { $addFields: cohortTPeriodRatesFields() },
    { $sort: { _id: 1 } }
  ]);
  return rows.map(r => ({ date: r._id, ...r, _id: undefined }));
}

router.get('/kpis', async (req, res) => {
  const match = buildMatch(req.query);
  const [agg] = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: null,
        total: { $sum: 1 },
        vetted: { $sum: ACCEPT_DENOM },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE },
        moreInfo: { $sum: IS_MOREINFO },
        raise: { $sum: IS_RAISE },
        doa: { $sum: IS_DOA },
        medianHoursAvg: { $avg: '$hours' },
        modelsSet: { $addToSet: '$machineModel' },
        anomalies: {
          $sum: { $cond: [{ $lt: ['$buildToFailDays', 0] }, 1, 0] }
        }
      } }
  ]);
  const pending = (agg?.total || 0) - (agg?.vetted || 0);
  res.json({
    total: agg?.total || 0,
    vetted: agg?.vetted || 0,
    pending,
    accept: agg?.accept || 0,
    reject: agg?.reject || 0,
    zcode: agg?.zcode || 0,
    moreInfo: agg?.moreInfo || 0,
    raise: agg?.raise || 0,
    doa: agg?.doa || 0,
    acceptRate: agg?.vetted ? (agg.accept / agg.vetted) : 0,
    rejectRate: agg?.vetted ? (agg.reject / agg.vetted) : 0,
    zcodeRate: agg?.vetted ? (agg.zcode / agg.vetted) : 0,
    doaRate: agg?.total ? (agg.doa / agg.total) : 0,
    activeModels: (agg?.modelsSet || []).length,
    anomalies: agg?.anomalies || 0,
    avgHours: agg?.medianHoursAvg || 0
  });
});

router.get('/trend', async (req, res) => {
  const match = buildMatch(req.query);
  const by = String(req.query.by || 'month');
  const unit = by === 'quarter' ? 'quarter' : 'month';
  const [vetted, built] = await Promise.all([
    Claim.aggregate([
      { $match: { ...match, vettedDate: { $ne: null, ...(match.vettedDate || {}) } } },
      { $group: {
          _id: { $dateTrunc: { date: '$vettedDate', unit } },
          n: { $sum: 1 },
          accept: { $sum: IS_ACCEPT },
          reject: { $sum: IS_REJECT },
          zcode: { $sum: IS_ZCODE }
        } },
      { $sort: { _id: 1 } }
    ]),
    Claim.aggregate([
      { $match: { ...match, buildDate: { $ne: null } } },
      { $group: { _id: { $dateTrunc: { date: '$buildDate', unit } }, n: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);
  res.json({
    by: unit,
    vetted: vetted.map(r => ({ date: r._id, n: r.n, accept: r.accept, reject: r.reject, zcode: r.zcode })),
    built: built.map(r => ({ date: r._id, n: r.n })),
    regimeDate: REGIME_DATE
  });
});

router.get('/by-model', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: '$machineModel',
        n: { $sum: 1 },
        doa: { $sum: IS_DOA },
        vetted: { $sum: ACCEPT_DENOM },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE }
      } },
    { $addFields: {
        doaRate: { $cond: [{ $gt: ['$n', 0] }, { $divide: ['$doa', '$n'] }, 0] },
        acceptRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$accept', '$vetted'] }, 0] },
        rejectRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$reject', '$vetted'] }, 0] },
        zcodeRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$zcode', '$vetted'] }, 0] }
      } },
    { $sort: { n: -1 } }
  ]);
  res.json(rows.map(r => ({ model: r._id, ...r, _id: undefined })));
});

router.get('/by-area', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: match },
    { $group: { _id: '$area', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $setWindowFields: {
        sortBy: { n: -1 },
        output: {
          cum: { $sum: '$n', window: { documents: ['unbounded', 'current'] } },
          total: { $sum: '$n', window: { documents: ['unbounded', 'unbounded'] } }
        }
      } },
    { $addFields: { cumPct: { $divide: ['$cum', '$total'] } } }
  ]);
  res.json(rows.map(r => ({ area: r._id, n: r.n, cumPct: r.cumPct })));
});

router.get('/top-parts', async (req, res) => {
  const match = buildMatch(req.query);
  const limit = Math.min(100, Number(req.query.limit) || 25);
  const rows = await Claim.aggregate([
    { $match: { ...match, failedPart: { $ne: '' } } },
    { $group: {
        _id: '$failedPart',
        n: { $sum: 1 },
        partCode: { $first: '$failedPartCode' },
        supplier: { $first: '$partSupplier' },
        topModel: { $first: '$machineModel' },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        vetted: { $sum: ACCEPT_DENOM }
      } },
    { $addFields: {
        acceptRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$accept', '$vetted'] }, 0] }
      } },
    { $sort: { n: -1 } },
    { $limit: limit }
  ]);
  res.json(rows.map(r => ({ failedPart: r._id, ...r, _id: undefined })));
});

router.get('/by-supplier', async (req, res) => {
  const match = buildMatch(req.query);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const rows = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: '$partSupplier',
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE },
        moreInfo: { $sum: IS_MOREINFO },
        raise: { $sum: IS_RAISE },
        vetted: { $sum: ACCEPT_DENOM }
      } },
    { $addFields: {
        acceptRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$accept', '$vetted'] }, 0] },
        rejectRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$reject', '$vetted'] }, 0] }
      } },
    { $sort: { n: -1 } },
    { $limit: limit }
  ]);
  res.json(rows.map(r => ({ supplier: r._id, ...r, _id: undefined })));
});

router.get('/by-country', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: '$country',
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        vetted: { $sum: ACCEPT_DENOM }
      } },
    { $addFields: {
        acceptRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$accept', '$vetted'] }, 0] }
      } },
    { $sort: { n: -1 } }
  ]);
  res.json(rows.map(r => ({ country: r._id, ...r, _id: undefined })));
});

router.get('/build-cohort', async (req, res) => {
  const match = buildMatch(req.query);
  res.json(await aggregateMonthlyCohort(match, 'buildDate'));
});

router.get('/claim-cohort', async (req, res) => {
  const match = buildMatch(req.query);
  res.json(await aggregateMonthlyCohort(match, 'vettedDate'));
});

router.get('/build-area-heat', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: { ...match, buildDate: { $ne: null } } },
    { $group: {
        _id: {
          ym: { $dateTrunc: { date: '$buildDate', unit: 'month' } },
          area: '$area'
        },
        n: { $sum: 1 }
      } },
    { $sort: { '_id.ym': 1 } }
  ]);
  res.json(rows.map(r => ({ ym: r._id.ym, area: r._id.area, n: r.n })));
});

router.get('/cohort-drill', async (req, res) => {
  const ym = req.query.ym ? new Date(String(req.query.ym)) : null;
  if (!ym || isNaN(ym.getTime())) return res.status(400).json({ error: 'ym required (YYYY-MM-01)' });
  const next = new Date(ym); next.setUTCMonth(next.getUTCMonth() + 1);
  const baseMatch = { buildDate: { $gte: ym, $lt: next } };

  const [parts, areas, tags, dealers, countries] = await Promise.all([
    Claim.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$failedPart', n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 10 }
    ]),
    Claim.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$area', n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 10 }
    ]),
    Claim.aggregate([
      { $match: baseMatch },
      { $unwind: '$descriptionTags' },
      { $group: { _id: '$descriptionTags', n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 15 }
    ]),
    Claim.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$dealer', n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 10 }
    ]),
    Claim.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$country', n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 10 }
    ])
  ]);

  res.json({ ym, parts, areas, tags, dealers, countries });
});

router.get('/hours-distribution', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: { ...match, hours: { $ne: null } } },
    { $bucket: {
        groupBy: '$hours',
        boundaries: [0, 25, 50, 100, 250, 500, 1000, 2500, 5000, 20001],
        default: 'other',
        output: { n: { $sum: 1 } }
      } }
  ]);
  res.json(rows);
});

router.get('/tperiod-mix', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: match },
    { $group: { _id: { model: '$machineModel', t: '$tPeriod' }, n: { $sum: 1 } } },
    { $sort: { '_id.model': 1 } }
  ]);
  res.json(rows.map(r => ({ model: r._id.model, tPeriod: r._id.t, n: r.n })));
});

router.get('/regime-impact', async (req, res) => {
  const match = buildMatch(req.query);
  const out = await Claim.aggregate([
    { $match: { ...match, claimOutcome: { $ne: null }, regime: { $in: ['pre-2025', 'post-2025'] } } },
    { $group: {
        _id: { regime: '$regime', outcome: '$claimOutcome' },
        n: { $sum: 1 }
      } }
  ]);
  const summary: Record<string, { total: number; outcomes: Record<string, number> }> = {
    'pre-2025': { total: 0, outcomes: {} },
    'post-2025': { total: 0, outcomes: {} }
  };
  for (const r of out) {
    const reg = r._id.regime as 'pre-2025' | 'post-2025';
    summary[reg].total += r.n;
    summary[reg].outcomes[r._id.outcome] = (summary[reg].outcomes[r._id.outcome] || 0) + r.n;
  }
  const outcomes = Array.from(new Set([
    ...Object.keys(summary['pre-2025'].outcomes),
    ...Object.keys(summary['post-2025'].outcomes)
  ])).sort();
  const rows = outcomes.map(o => {
    const preN = summary['pre-2025'].outcomes[o] || 0;
    const postN = summary['post-2025'].outcomes[o] || 0;
    const prePct = summary['pre-2025'].total ? preN / summary['pre-2025'].total : 0;
    const postPct = summary['post-2025'].total ? postN / summary['post-2025'].total : 0;
    return { outcome: o, preN, postN, prePct, postPct, deltaPp: (postPct - prePct) * 100 };
  });
  res.json({
    regimeDate: REGIME_DATE,
    preTotal: summary['pre-2025'].total,
    postTotal: summary['post-2025'].total,
    rows
  });
});

router.get('/outcome-monthly', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null } } },
    { $group: {
        _id: { ym: { $dateTrunc: { date: '$vettedDate', unit: 'month' } }, outcome: '$claimOutcome' },
        n: { $sum: 1 }
      } },
    { $sort: { '_id.ym': 1 } }
  ]);
  res.json(rows.map(r => ({ ym: r._id.ym, outcome: r._id.outcome, n: r.n })));
});

router.get('/vetter-scorecard', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: { ...match, vettedBy: { $ne: null } } },
    { $group: {
        _id: '$vettedBy',
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE },
        moreInfo: { $sum: IS_MOREINFO },
        raise: { $sum: IS_RAISE },
        vetted: { $sum: ACCEPT_DENOM },
        avgDaysToVet: {
          $avg: {
            $cond: [
              { $and: [{ $ne: ['$claimDate', null] }, { $ne: ['$vettedDate', null] }] },
              { $divide: [{ $subtract: ['$vettedDate', '$claimDate'] }, 86400000] },
              null
            ]
          }
        },
        firstSeen: { $min: '$vettedDate' },
        lastSeen: { $max: '$vettedDate' }
      } },
    { $addFields: {
        acceptRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$accept', '$vetted'] }, 0] },
        rejectRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$reject', '$vetted'] }, 0] },
        zcodeRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$zcode', '$vetted'] }, 0] }
      } },
    { $sort: { n: -1 } }
  ]);
  res.json(rows.map(r => ({ vetter: r._id, ...r, _id: undefined })));
});

router.get('/vetter-monthly', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: { ...match, vettedBy: { $ne: null }, vettedDate: { $ne: null } } },
    { $group: {
        _id: { vetter: '$vettedBy', ym: { $dateTrunc: { date: '$vettedDate', unit: 'month' } } },
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE }
      } },
    { $addFields: {
        acceptRate: { $cond: [{ $gt: ['$n', 0] }, { $divide: ['$accept', '$n'] }, 0] },
        rejectRate: { $cond: [{ $gt: ['$n', 0] }, { $divide: ['$reject', '$n'] }, 0] },
        zcodeRate: { $cond: [{ $gt: ['$n', 0] }, { $divide: ['$zcode', '$n'] }, 0] }
      } },
    { $sort: { '_id.ym': 1 } }
  ]);
  res.json(rows.map(r => ({ vetter: r._id.vetter, ym: r._id.ym, n: r.n,
    acceptRate: r.acceptRate, rejectRate: r.rejectRate, zcodeRate: r.zcodeRate })));
});

const DIM_MAP: Record<string, string> = {
  area: '$area', theme: '$theme', model: '$machineModel',
  supplier: '$partSupplier', tPeriod: '$tPeriod',
  hoursBucket: '$hoursBucket', country: '$country', dealer: '$dealer',
  vetter: '$vettedBy', detection: '$detection', tag: '$descriptionTags'
};

router.get('/outcome-drivers', async (req, res) => {
  const match = buildMatch(req.query);
  const dim = String(req.query.dimension || 'area');
  const minN = Number(req.query.minN) || 30;
  const fieldExpr = DIM_MAP[dim];
  if (!fieldExpr) return res.status(400).json({ error: `unknown dimension: ${dim}` });

  const stages: any[] = [{ $match: { ...match, claimOutcome: { $ne: null } } }];
  if (dim === 'tag') stages.push({ $unwind: '$descriptionTags' });

  stages.push(
    { $group: {
        _id: fieldExpr,
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE },
        moreInfo: { $sum: IS_MOREINFO },
        raise: { $sum: IS_RAISE }
      } },
    { $match: { n: { $gte: minN } } },
    { $addFields: {
        acceptRate: { $divide: ['$accept', '$n'] },
        rejectRate: { $divide: ['$reject', '$n'] },
        zcodeRate: { $divide: ['$zcode', '$n'] }
      } },
    { $setWindowFields: {
        sortBy: { n: -1 },
        output: {
          baselineAccept: { $avg: '$acceptRate', window: { documents: ['unbounded', 'unbounded'] } },
          baselineReject: { $avg: '$rejectRate', window: { documents: ['unbounded', 'unbounded'] } },
          baselineZcode: { $avg: '$zcodeRate', window: { documents: ['unbounded', 'unbounded'] } }
        }
      } },
    { $addFields: {
        acceptDelta: { $subtract: ['$acceptRate', '$baselineAccept'] },
        rejectDelta: { $subtract: ['$rejectRate', '$baselineReject'] },
        zcodeDelta: { $subtract: ['$zcodeRate', '$baselineZcode'] }
      } },
    { $sort: { n: -1 } }
  );
  const rows = await Claim.aggregate(stages);
  res.json({
    dimension: dim,
    rows: rows.map(r => ({ value: r._id, ...r, _id: undefined }))
  });
});

router.get('/description-tags', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: match },
    { $unwind: '$descriptionTags' },
    { $group: {
        _id: '$descriptionTags',
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE },
        vetted: { $sum: ACCEPT_DENOM }
      } },
    { $addFields: {
        acceptRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$accept', '$vetted'] }, 0] },
        rejectRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$reject', '$vetted'] }, 0] }
      } },
    { $sort: { n: -1 } }
  ]);
  res.json(rows.map(r => ({ tag: r._id, ...r, _id: undefined })));
});

router.get('/description-ngrams', async (req, res) => {
  const match = buildMatch(req.query);
  const n = Number(req.query.n) === 2 ? 2 : 1;
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const field = n === 2 ? '$descriptionBigrams' : '$descriptionTokens';
  const rows = await Claim.aggregate([
    { $match: match },
    { $unwind: field },
    { $group: { _id: field, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: limit }
  ]);
  res.json(rows.map(r => ({ token: r._id, n: r.n })));
});

router.get('/description-trend', async (req, res) => {
  const match = buildMatch(req.query);
  const tagsParam = req.query.tags;
  const tags = Array.isArray(tagsParam)
    ? tagsParam.map(String)
    : String(tagsParam || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!tags.length) return res.json([]);
  const rows = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null }, descriptionTags: { $in: tags } } },
    { $unwind: '$descriptionTags' },
    { $match: { descriptionTags: { $in: tags } } },
    { $group: {
        _id: { ym: { $dateTrunc: { date: '$vettedDate', unit: 'month' } }, tag: '$descriptionTags' },
        n: { $sum: 1 }
      } },
    { $sort: { '_id.ym': 1 } }
  ]);
  res.json(rows.map(r => ({ ym: r._id.ym, tag: r._id.tag, n: r.n })));
});

router.get('/description-search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  const match = buildMatch(req.query);
  const limit = Math.min(100, Number(req.query.limit) || 25);
  const rows = await Claim.aggregate([
    { $match: { ...match, $text: { $search: q } } },
    { $addFields: { score: { $meta: 'textScore' } } },
    { $sort: { score: { $meta: 'textScore' } } },
    { $limit: limit },
    { $project: {
        _id: 1, machineModel: 1, vettedDate: 1, buildDate: 1, claimOutcome: 1,
        country: 1, dealer: 1, description: 1, descriptionTags: 1, score: 1
      } }
  ]);
  res.json(rows);
});

router.get('/anomalies', async (req, res) => {
  const match = buildMatch(req.query);
  const [a] = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: null,
        total: { $sum: 1 },
        negBuildToFail: { $sum: { $cond: [{ $lt: ['$buildToFailDays', 0] }, 1, 0] } },
        missingFailDate: { $sum: { $cond: [{ $eq: ['$failDate', null] }, 1, 0] } },
        missingClaimDate: { $sum: { $cond: [{ $eq: ['$claimDate', null] }, 1, 0] } },
        unvetted: { $sum: { $cond: [{ $eq: ['$claimOutcome', null] }, 1, 0] } },
        unknownArea: { $sum: { $cond: [{ $eq: ['$area', 'Unknown'] }, 1, 0] } },
        unknownTheme: { $sum: { $cond: [{ $eq: ['$theme', 'Unknown'] }, 1, 0] } },
        nullHours: { $sum: { $cond: [{ $eq: ['$hours', null] }, 1, 0] } },
        descTruncated: { $sum: { $cond: [{ $gte: [{ $strLenCP: { $ifNull: ['$description', ''] } }, 600] }, 1, 0] } },
        themeAsOutcome: { $sum: { $cond: [{ $in: ['$theme', ['Z Code', 'Z Coded', 'Z-Code']] }, 1, 0] } }
      } }
  ]);
  res.json(a || {});
});

router.get('/serial-recidivism', async (req, res) => {
  const match = buildMatch(req.query);
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const minClaims = Math.max(2, Number(req.query.minClaims) || 5);
  const [summary] = await Claim.aggregate([
    { $match: match },
    { $group: { _id: '$serial', n: { $sum: 1 } } },
    { $group: {
        _id: null,
        totalSerials: { $sum: 1 },
        repeat2: { $sum: { $cond: [{ $gte: ['$n', 2] }, 1, 0] } },
        repeat5: { $sum: { $cond: [{ $gte: ['$n', 5] }, 1, 0] } },
        repeat10: { $sum: { $cond: [{ $gte: ['$n', 10] }, 1, 0] } }
      } }
  ]);

  // Anchor "now" to the latest vettedDate actually in the data so the recurrence
  // prediction is meaningful even when the dataset is a few months old.
  const [latest] = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null } } },
    { $group: { _id: null, max: { $max: '$vettedDate' } } }
  ]);
  const anchor: Date = latest?.max ? new Date(latest.max) : new Date();

  const rows = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: '$serial',
        n: { $sum: 1 },
        machineModel: { $first: '$machineModel' },
        country: { $first: '$country' },
        dealer: { $first: '$dealer' },
        topArea: { $first: '$area' },
        firstBuild: { $min: '$buildDate' },
        firstVetted: { $min: '$vettedDate' },
        lastVetted: { $max: '$vettedDate' },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE }
      } },
    { $match: { n: { $gte: minClaims } } },
    { $sort: { n: -1 } },
    { $limit: limit }
  ]);

  // Recurrence prediction (rule-based, no model):
  // a serial with >= 3 historical claims AND >= 180 days since its last vetted claim
  // is flagged as "likely to claim again" - the gap suggests it's been in service long
  // enough for components to wear, and the history shows it's a repeat-offender.
  const enriched = rows.map(r => {
    const last = r.lastVetted ? new Date(r.lastVetted) : null;
    const daysSinceLastClaim = last
      ? Math.max(0, Math.round((anchor.getTime() - last.getTime()) / 86400000))
      : null;
    const likelyRepeat = r.n >= 3 && daysSinceLastClaim !== null && daysSinceLastClaim >= 180;
    return { serial: r._id, ...r, _id: undefined, daysSinceLastClaim, likelyRepeat };
  });

  res.json({ summary: summary || {}, anchorDate: anchor, rows: enriched });
});

router.get('/pdi-escape', async (req, res) => {
  const match = buildMatch(req.query);
  const PDI_VALUES = ['Ops Pdi', 'Operations PDI', 'UV', 'Uv1', 'Uv2', 'Booms SIP', 'Cycle Test'];
  const [summary] = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: null,
        total: { $sum: 1 },
        escaped: { $sum: { $cond: [{ $in: ['$detection', PDI_VALUES] }, 1, 0] } }
      } }
  ]);
  const byDetection = await Claim.aggregate([
    { $match: { ...match, detection: { $in: PDI_VALUES } } },
    { $group: { _id: '$detection', n: { $sum: 1 } } },
    { $sort: { n: -1 } }
  ]);
  const topParts = await Claim.aggregate([
    { $match: { ...match, detection: { $in: PDI_VALUES }, failedPart: { $ne: '' } } },
    { $group: { _id: '$failedPart', n: { $sum: 1 }, supplier: { $first: '$partSupplier' } } },
    { $sort: { n: -1 } },
    { $limit: 25 }
  ]);
  const total = summary?.total || 0;
  const escaped = summary?.escaped || 0;
  res.json({
    total, escaped,
    escapeRate: total ? escaped / total : 0,
    byDetection: byDetection.map(r => ({ detection: r._id, n: r.n })),
    topParts: topParts.map(r => ({ failedPart: r._id, n: r.n, supplier: r.supplier }))
  });
});

router.get('/cannot-detect-trend', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null } } },
    { $group: {
        _id: { $dateTrunc: { date: '$vettedDate', unit: 'month' } },
        n: { $sum: 1 },
        cannotDetect: { $sum: { $cond: [{ $eq: ['$detection', 'Cannot Detect'] }, 1, 0] } }
      } },
    { $addFields: { rate: { $cond: [{ $gt: ['$n', 0] }, { $divide: ['$cannotDetect', '$n'] }, 0] } } },
    { $sort: { _id: 1 } }
  ]);
  res.json(rows.map(r => ({ date: r._id, n: r.n, cannotDetect: r.cannotDetect, rate: r.rate })));
});

router.get('/seasonality', async (req, res) => {
  const match = buildMatch(req.query);
  const dow = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null } } },
    { $group: { _id: { $dayOfWeek: '$vettedDate' }, n: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const moy = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null } } },
    { $group: { _id: { $month: '$vettedDate' }, n: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const moyNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  res.json({
    dayOfWeek: dow.map(r => ({ day: dowNames[(r._id - 1) % 7], idx: r._id, n: r.n })),
    monthOfYear: moy.map(r => ({ month: moyNames[(r._id - 1) % 12], idx: r._id, n: r.n }))
  });
});

router.get('/time-to-vet', async (req, res) => {
  const match = buildMatch(req.query);
  const lagExpr = {
    $cond: [
      { $and: [{ $ne: ['$claimDate', null] }, { $ne: ['$vettedDate', null] }] },
      { $divide: [{ $subtract: ['$vettedDate', '$claimDate'] }, 86400000] },
      null
    ]
  };
  const overall = await Claim.aggregate([
    { $match: { ...match, claimDate: { $ne: null }, vettedDate: { $ne: null } } },
    { $addFields: { lag: lagExpr } },
    { $match: { lag: { $gte: 0, $lte: 365 } } },
    { $group: {
        _id: { regime: '$regime', ym: { $dateTrunc: { date: '$vettedDate', unit: 'month' } } },
        avg: { $avg: '$lag' }, n: { $sum: 1 }
      } },
    { $sort: { '_id.ym': 1 } }
  ]);
  const byVetter = await Claim.aggregate([
    { $match: { ...match, claimDate: { $ne: null }, vettedDate: { $ne: null }, vettedBy: { $ne: null } } },
    { $addFields: { lag: lagExpr } },
    { $match: { lag: { $gte: 0, $lte: 365 } } },
    { $group: {
        _id: '$vettedBy',
        avg: { $avg: '$lag' }, n: { $sum: 1 }
      } },
    { $sort: { n: -1 } }
  ]);
  res.json({
    monthly: overall.map(r => ({ ym: r._id.ym, regime: r._id.regime, avg: r.avg, n: r.n })),
    byVetter: byVetter.map(r => ({ vetter: r._id, avg: r.avg, n: r.n }))
  });
});

router.get('/by-asd', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: { $ifNull: ['$asd', 'Unknown'] },
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE },
        moreInfo: { $sum: IS_MOREINFO },
        raise: { $sum: IS_RAISE },
        vetted: { $sum: ACCEPT_DENOM }
      } },
    { $addFields: {
        acceptRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$accept', '$vetted'] }, 0] },
        rejectRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$reject', '$vetted'] }, 0] },
        zcodeRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$zcode', '$vetted'] }, 0] }
      } },
    { $sort: { n: -1 } }
  ]);
  res.json(rows.map(r => ({ asd: r._id, ...r, _id: undefined })));
});

router.get('/by-dealer', async (req, res) => {
  const match = buildMatch(req.query);
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const rows = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: '$dealer',
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE },
        vetted: { $sum: ACCEPT_DENOM },
        countries: { $addToSet: '$country' }
      } },
    { $addFields: {
        acceptRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$accept', '$vetted'] }, 0] },
        rejectRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$reject', '$vetted'] }, 0] },
        zcodeRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$zcode', '$vetted'] }, 0] },
        countryCount: { $size: '$countries' }
      } },
    { $project: { countries: 0 } },
    { $sort: { n: -1 } },
    { $limit: limit }
  ]);
  res.json(rows.map(r => ({ dealer: r._id, ...r, _id: undefined })));
});

router.get('/by-customer', async (req, res) => {
  const match = buildMatch(req.query);
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const rows = await Claim.aggregate([
    { $match: { ...match, customer: { $nin: ['', '#'] } } },
    { $group: {
        _id: '$customer',
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE },
        vetted: { $sum: ACCEPT_DENOM }
      } },
    { $addFields: {
        acceptRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$accept', '$vetted'] }, 0] },
        rejectRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$reject', '$vetted'] }, 0] },
        zcodeRate: { $cond: [{ $gt: ['$vetted', 0] }, { $divide: ['$zcode', '$vetted'] }, 0] }
      } },
    { $sort: { n: -1 } },
    { $limit: limit }
  ]);
  res.json(rows.map(r => ({ customer: r._id, ...r, _id: undefined })));
});

router.get('/zcode-drivers', async (req, res) => {
  const match = buildMatch(req.query);
  const base = { ...match, claimOutcome: 'Z Code' };
  const limit = 15;
  const [parts, areas, themes, suppliers, models, total] = await Promise.all([
    Claim.aggregate([{ $match: { ...base, failedPart: { $ne: '' } } }, { $group: { _id: '$failedPart', n: { $sum: 1 }, supplier: { $first: '$partSupplier' } } }, { $sort: { n: -1 } }, { $limit: limit }]),
    Claim.aggregate([{ $match: base }, { $group: { _id: '$area', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: limit }]),
    Claim.aggregate([{ $match: base }, { $group: { _id: '$theme', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: limit }]),
    Claim.aggregate([{ $match: base }, { $group: { _id: '$partSupplier', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: limit }]),
    Claim.aggregate([{ $match: base }, { $group: { _id: '$machineModel', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: limit }]),
    Claim.countDocuments(base)
  ]);
  res.json({
    total,
    parts: parts.map(r => ({ failedPart: r._id, n: r.n, supplier: r.supplier })),
    areas: areas.map(r => ({ area: r._id, n: r.n })),
    themes: themes.map(r => ({ theme: r._id, n: r.n })),
    suppliers: suppliers.map(r => ({ supplier: r._id, n: r.n })),
    models: models.map(r => ({ model: r._id, n: r.n }))
  });
});

router.get('/theme-integrity', async (req, res) => {
  const match = buildMatch(req.query);
  const OUTCOME_LIKE = ['Z Code', 'Z Coded', 'Z-Code', 'Accept', 'Reject'];
  const [total] = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: null,
        n: { $sum: 1 },
        mislabelled: { $sum: { $cond: [{ $in: ['$theme', OUTCOME_LIKE] }, 1, 0] } }
      } }
  ]);
  const samples = await Claim.find({ ...match, theme: { $in: OUTCOME_LIKE } })
    .select('_id machineModel area theme claimOutcome vettedBy vettedDate')
    .limit(25)
    .lean();
  res.json({ total: total?.n || 0, mislabelled: total?.mislabelled || 0, samples });
});

router.get('/tag-cooccurrence', async (req, res) => {
  const match = buildMatch(req.query);
  const topN = Math.min(30, Number(req.query.topN) || 15);
  const topTags = await Claim.aggregate([
    { $match: match },
    { $unwind: '$descriptionTags' },
    { $group: { _id: '$descriptionTags', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: topN }
  ]);
  const tagSet = topTags.map(t => t._id);
  const pairs = await Claim.aggregate([
    { $match: { ...match, descriptionTags: { $in: tagSet } } },
    { $project: { tags: { $filter: { input: '$descriptionTags', as: 't', cond: { $in: ['$$t', tagSet] } } } } },
    { $match: { 'tags.1': { $exists: true } } },
    { $project: { pair: { $reduce: {
        input: { $range: [0, { $size: '$tags' }] }, initialValue: [],
        in: { $concatArrays: ['$$value', { $map: {
          input: { $range: [{ $add: ['$$this', 1] }, { $size: '$tags' }] }, as: 'j',
          in: { a: { $arrayElemAt: ['$tags', '$$this'] }, b: { $arrayElemAt: ['$tags', '$$j'] } }
        } }] }
      } } } },
    { $unwind: '$pair' },
    { $group: { _id: { a: '$pair.a', b: '$pair.b' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 300 }
  ]);
  res.json({
    tags: topTags.map(t => ({ tag: t._id, n: t.n })),
    pairs: pairs.map(p => ({ a: p._id.a, b: p._id.b, n: p.n }))
  });
});

router.get('/yoy', async (req, res) => {
  const match = buildMatch(req.query);
  const rows = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null } } },
    { $group: {
        _id: { y: { $year: '$vettedDate' }, m: { $month: '$vettedDate' } },
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE }
      } },
    { $sort: { '_id.y': 1, '_id.m': 1 } }
  ]);
  res.json(rows.map(r => ({ year: r._id.y, month: r._id.m, n: r.n, accept: r.accept, reject: r.reject, zcode: r.zcode })));
});

router.get('/movers', async (req, res) => {
  const match = buildMatch(req.query);
  const dim = String(req.query.dim || 'area');
  const periodDays = Math.max(7, Number(req.query.periodDays) || 90);
  const fieldExpr = DIM_MAP[dim] || '$area';
  // Anchor to the latest vettedDate actually present in the data so movers are
  // always meaningful regardless of when the dashboard is opened.
  const [latest] = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null } } },
    { $group: { _id: null, max: { $max: '$vettedDate' } } }
  ]);
  const now: Date = latest?.max ? new Date(latest.max) : new Date();
  const cutA = new Date(now.getTime() - periodDays * 86400000);
  const cutB = new Date(cutA.getTime() - periodDays * 86400000);

  const stagesFor = (from: Date, to: Date) => {
    const s: any[] = [
      { $match: { ...match, vettedDate: { $gte: from, $lt: to } } }
    ];
    if (dim === 'tag') s.push({ $unwind: '$descriptionTags' });
    s.push(
      { $group: { _id: fieldExpr, n: { $sum: 1 } } }
    );
    return s;
  };
  const [current, prior] = await Promise.all([
    Claim.aggregate(stagesFor(cutA, now)),
    Claim.aggregate(stagesFor(cutB, cutA))
  ]);
  const map = new Map<string, { value: string; current: number; prior: number }>();
  for (const r of current) map.set(String(r._id), { value: String(r._id), current: r.n, prior: 0 });
  for (const r of prior) {
    const k = String(r._id);
    if (map.has(k)) map.get(k)!.prior = r.n; else map.set(k, { value: k, current: 0, prior: r.n });
  }
  const rows = Array.from(map.values())
    .filter(r => (r.current + r.prior) >= 10)
    .map(r => ({ ...r, delta: r.current - r.prior, pctChange: r.prior > 0 ? (r.current - r.prior) / r.prior : (r.current > 0 ? 1 : 0) }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 40);
  res.json({ dim, periodDays, current: { from: cutA, to: now }, prior: { from: cutB, to: cutA }, rows });
});

router.get('/recent-activity', async (req, res) => {
  const match = buildMatch(req.query);
  const limit = Math.min(50, Number(req.query.limit) || 15);
  const rows = await Claim.find({ ...match, vettedDate: { $ne: null } })
    .sort({ vettedDate: -1 })
    .limit(limit)
    .select('_id machineModel area claimOutcome vettedDate vettedBy country descriptionTags description tPeriod failedPart')
    .lean();
  res.json(rows);
});

router.get('/tag-sparklines', async (req, res) => {
  const match = buildMatch(req.query);
  const topN = Math.min(20, Number(req.query.topN) || 8);
  const topTags = await Claim.aggregate([
    { $match: match },
    { $unwind: '$descriptionTags' },
    { $group: { _id: '$descriptionTags', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: topN }
  ]);
  const tagSet = topTags.map(t => t._id);
  const series = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null }, descriptionTags: { $in: tagSet } } },
    { $unwind: '$descriptionTags' },
    { $match: { descriptionTags: { $in: tagSet } } },
    { $group: {
        _id: { tag: '$descriptionTags', ym: { $dateTrunc: { date: '$vettedDate', unit: 'month' } } },
        n: { $sum: 1 }
      } },
    { $sort: { '_id.ym': 1 } }
  ]);
  const byTag: Record<string, { ym: Date; n: number }[]> = {};
  for (const t of tagSet) byTag[t] = [];
  for (const r of series) byTag[r._id.tag].push({ ym: r._id.ym, n: r.n });
  res.json(tagSet.map(t => {
    const points = byTag[t];
    const total = points.reduce((s, p) => s + p.n, 0);
    const last3 = points.slice(-3).reduce((s, p) => s + p.n, 0);
    const prev3 = points.slice(-6, -3).reduce((s, p) => s + p.n, 0);
    const momentum = prev3 > 0 ? (last3 - prev3) / prev3 : (last3 > 0 ? 1 : 0);
    return { tag: t, total, points, momentum, last3, prev3 };
  }));
});

router.get('/headlines', async (req, res) => {
  const match = buildMatch(req.query);
  const headlines: any[] = [];

  // 1. Regime shift summary
  const [reg] = await Claim.aggregate([
    { $match: { ...match, claimOutcome: { $ne: null }, regime: { $in: ['pre-2025', 'post-2025'] } } },
    { $group: {
        _id: '$regime',
        n: { $sum: 1 },
        accept: { $sum: IS_ACCEPT },
        reject: { $sum: IS_REJECT },
        zcode: { $sum: IS_ZCODE }
      } },
    { $group: { _id: null, rows: { $push: '$$ROOT' } } }
  ]);
  if (reg) {
    const pre = reg.rows.find((r: any) => r._id === 'pre-2025');
    const post = reg.rows.find((r: any) => r._id === 'post-2025');
    if (pre && post) {
      const accDelta = ((post.accept / post.n) - (pre.accept / pre.n)) * 100;
      const rejDelta = ((post.reject / post.n) - (pre.reject / pre.n)) * 100;
      headlines.push({
        kind: accDelta < -5 ? 'warn' : 'info',
        icon: 'shield',
        title: 'Vetting regime impact',
        body: `Accept rate ${accDelta.toFixed(1)} pp · Reject rate ${rejDelta >= 0 ? '+' : ''}${rejDelta.toFixed(1)} pp post-Jan 2025 (n pre=${pre.n.toLocaleString()}, post=${post.n.toLocaleString()})`
      });
    }
  }

  // 2. Cannot Detect trend
  const cd = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null } } },
    { $group: {
        _id: { $dateTrunc: { date: '$vettedDate', unit: 'month' } },
        n: { $sum: 1 },
        cd: { $sum: { $cond: [{ $eq: ['$detection', 'Cannot Detect'] }, 1, 0] } }
      } },
    { $sort: { _id: 1 } }
  ]);
  if (cd.length >= 6) {
    const last3 = cd.slice(-3);
    const first = cd.slice(0, Math.min(6, cd.length - 3));
    const lastRate = last3.reduce((s, r) => s + r.cd, 0) / Math.max(1, last3.reduce((s, r) => s + r.n, 0));
    const firstRate = first.reduce((s, r) => s + r.cd, 0) / Math.max(1, first.reduce((s, r) => s + r.n, 0));
    const factor = firstRate > 0 ? lastRate / firstRate : 0;
    if (factor > 3) {
      headlines.push({
        kind: 'bad',
        icon: 'eye-off',
        title: '"Cannot Detect" surge',
        body: `Cannot-Detect rate ${(lastRate * 100).toFixed(1)} % in recent 3 mo vs ${(firstRate * 100).toFixed(1)} % in early months (${factor.toFixed(1)}× shift)`
      });
    }
  }

  // 3. Top failed part
  const [topPart] = await Claim.aggregate([
    { $match: { ...match, failedPart: { $ne: '' } } },
    { $group: { _id: '$failedPart', n: { $sum: 1 }, supplier: { $first: '$partSupplier' } } },
    { $sort: { n: -1 } }, { $limit: 1 }
  ]);
  if (topPart) {
    headlines.push({
      kind: 'warn',
      icon: 'wrench',
      title: 'Top failed part',
      body: `${topPart._id} · ${topPart.n.toLocaleString()} claims · supplier ${topPart.supplier}`
    });
  }

  // 4. Worst DOA model
  const [worstDoa] = await Claim.aggregate([
    { $match: match },
    { $group: { _id: '$machineModel', n: { $sum: 1 }, doa: { $sum: IS_DOA } } },
    { $match: { n: { $gte: 100 } } },
    { $addFields: { doaRate: { $divide: ['$doa', '$n'] } } },
    { $sort: { doaRate: -1 } }, { $limit: 1 }
  ]);
  if (worstDoa) {
    headlines.push({
      kind: 'bad',
      icon: 'skull',
      title: 'Worst-DOA family',
      body: `${worstDoa._id} · ${(worstDoa.doaRate * 100).toFixed(1)} % DOA rate over ${worstDoa.n.toLocaleString()} claims`
    });
  }

  // 5. Repeat-offender stat
  const [recid] = await Claim.aggregate([
    { $match: match },
    { $group: { _id: '$serial', n: { $sum: 1 } } },
    { $group: {
        _id: null,
        serials: { $sum: 1 },
        repeat5: { $sum: { $cond: [{ $gte: ['$n', 5] }, 1, 0] } },
        repeat10: { $sum: { $cond: [{ $gte: ['$n', 10] }, 1, 0] } }
      } }
  ]);
  if (recid) {
    headlines.push({
      kind: 'info',
      icon: 'repeat',
      title: 'Repeat-offender machines',
      body: `${recid.repeat5.toLocaleString()} serials with ≥5 claims, ${recid.repeat10.toLocaleString()} with ≥10 (of ${recid.serials.toLocaleString()} total)`
    });
  }

  // 6. PDI escape rate
  const PDI = ['Ops Pdi', 'Operations PDI', 'UV', 'Uv1', 'Uv2', 'Booms SIP', 'Cycle Test'];
  const [pdi] = await Claim.aggregate([
    { $match: match },
    { $group: {
        _id: null,
        n: { $sum: 1 },
        esc: { $sum: { $cond: [{ $in: ['$detection', PDI] }, 1, 0] } }
      } }
  ]);
  if (pdi && pdi.n > 0) {
    const rate = pdi.esc / pdi.n;
    if (rate > 0.2) {
      headlines.push({
        kind: 'warn',
        icon: 'shield-alert',
        title: 'PDI / UV escape rate',
        body: `${(rate * 100).toFixed(1)} % of claims could have been caught in PDI / UV inspection (${pdi.esc.toLocaleString()} of ${pdi.n.toLocaleString()})`
      });
    }
  }

  // 7. Hottest description tag
  const [hotTag] = await Claim.aggregate([
    { $match: { ...match, descriptionTags: { $exists: true, $ne: [] } } },
    { $unwind: '$descriptionTags' },
    { $group: { _id: '$descriptionTags', n: { $sum: 1 } } },
    { $sort: { n: -1 } }, { $limit: 1 }
  ]);
  if (hotTag) {
    headlines.push({
      kind: 'info',
      icon: 'tag',
      title: 'Dominant symptom',
      body: `${hotTag._id} appears in ${hotTag.n.toLocaleString()} claim descriptions`
    });
  }

  res.json(headlines);
});

router.get('/daily-heatmap', async (req, res) => {
  const match = buildMatch(req.query);
  // Anchor to the latest vettedDate in the data and return the trailing 365 days,
  // padded with zeros so the calendar grid is dense.
  const [latest] = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $ne: null } } },
    { $group: { _id: null, max: { $max: '$vettedDate' } } }
  ]);
  const anchor: Date = latest?.max ? new Date(latest.max) : new Date();
  const from = new Date(anchor.getTime() - 365 * 86400000);
  const rows = await Claim.aggregate([
    { $match: { ...match, vettedDate: { $gte: from, $lte: anchor } } },
    { $group: {
        _id: { $dateTrunc: { date: '$vettedDate', unit: 'day' } },
        n: { $sum: 1 }
      } },
    { $sort: { _id: 1 } }
  ]);
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = new Date(r._id).toISOString().slice(0, 10);
    map.set(key, r.n);
  }
  const days: Array<{ date: string; n: number }> = [];
  for (let d = new Date(from); d <= anchor; d = new Date(d.getTime() + 86400000)) {
    const k = d.toISOString().slice(0, 10);
    days.push({ date: k, n: map.get(k) || 0 });
  }
  res.json({ anchorDate: anchor, from, days });
});

router.get('/sankey', async (req, res) => {
  const match = buildMatch(req.query);
  // Three-tier flow: top 8 areas -> top 12 failed parts -> 4 outcome buckets.
  // We pre-pick the top N at tiers 1 and 2, then count flows through the joint cross-tab.
  const [topAreas, topParts] = await Promise.all([
    Claim.aggregate([
      { $match: match },
      { $group: { _id: '$area', n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 8 }
    ]),
    Claim.aggregate([
      { $match: { ...match, failedPart: { $ne: '' } } },
      { $group: { _id: '$failedPart', n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 12 }
    ])
  ]);
  const areaSet = new Set(topAreas.map(r => r._id));
  const partSet = new Set(topParts.map(r => r._id));

  // Outcome buckets (collapse less-common outcomes into Other so the diagram is readable)
  const bucketOutcome = (o: string | null) => {
    if (o === 'Accept' || o === 'Reject' || o === 'Z Code') return o;
    return 'Other';
  };

  const rows = await Claim.aggregate([
    { $match: {
        ...match,
        area: { $in: Array.from(areaSet) },
        failedPart: { $in: Array.from(partSet) },
        claimOutcome: { $ne: null }
      } },
    { $group: {
        _id: { area: '$area', part: '$failedPart', outcome: '$claimOutcome' },
        n: { $sum: 1 }
      } }
  ]);

  // Build node + link arrays in Recharts Sankey shape.
  // Tier prefixes prevent name collisions between an area called 'X' and a part called 'X'.
  const nodes: Array<{ name: string }> = [];
  const idx = new Map<string, number>();
  const addNode = (name: string) => {
    if (idx.has(name)) return idx.get(name)!;
    idx.set(name, nodes.length);
    nodes.push({ name });
    return nodes.length - 1;
  };

  for (const a of areaSet) addNode(`A:${a}`);
  for (const p of partSet) addNode(`P:${String(p).slice(0, 38)}`);
  ['Accept', 'Reject', 'Z Code', 'Other'].forEach(o => addNode(`O:${o}`));

  type Link = { source: number; target: number; value: number };
  const a2p = new Map<string, number>();
  const p2o = new Map<string, number>();
  for (const r of rows) {
    const a = `A:${r._id.area}`;
    const p = `P:${String(r._id.part).slice(0, 38)}`;
    const o = `O:${bucketOutcome(r._id.outcome)}`;
    a2p.set(`${a}|${p}`, (a2p.get(`${a}|${p}`) || 0) + r.n);
    p2o.set(`${p}|${o}`, (p2o.get(`${p}|${o}`) || 0) + r.n);
  }
  const links: Link[] = [];
  for (const [k, v] of a2p.entries()) {
    const [a, p] = k.split('|');
    links.push({ source: addNode(a), target: addNode(p), value: v });
  }
  for (const [k, v] of p2o.entries()) {
    const [p, o] = k.split('|');
    links.push({ source: addNode(p), target: addNode(o), value: v });
  }

  res.json({ nodes, links });
});

router.get('/by-vettersnotes', async (req, res) => {
  const match = buildMatch(req.query);
  // mine vetter notes via simple unigram aggregation on the field (no pre-indexed tokens)
  // Cheap approach: only run on top 5k docs by vettedDate
  const docs = await Claim.find({ ...match, vettersNotes: { $ne: '' } })
    .select('vettersNotes')
    .sort({ vettedDate: -1 })
    .limit(8000)
    .lean();
  const STOP = new Set('the a an and or to of in on at for with by is are was were be been being have has had this that those these it its as from not into out about over under up down off if then so than but no yes do does did will would could should can may might must i we you they he she him her us them my our your their me also any some all more most few other only same such very each both again here there when where why how what which who whom one two too vs claim'.split(' '));
  const c = new Map<string, number>();
  for (const d of docs) {
    const text = (d.vettersNotes || '').toLowerCase();
    const toks = text.match(/[a-z][a-z'\-]{2,}/g) || [];
    for (const t of toks) {
      if (STOP.has(t) || t.length < 3) continue;
      c.set(t, (c.get(t) || 0) + 1);
    }
  }
  const rows = Array.from(c.entries()).sort((a, b) => b[1] - a[1]).slice(0, 60);
  res.json({ sampledDocs: docs.length, rows: rows.map(([token, n]) => ({ token, n })) });
});

export default router;
