import { Schema, model } from 'mongoose';

const ClaimSchema = new Schema({
  _id: { type: Number, required: true },
  area: { type: String, default: 'Unknown' },
  asd: { type: String, default: 'Unknown' },
  machineModel: { type: String, index: true },
  buildDate: { type: Date, index: true },
  claimDate: Date,
  serial: Number,
  country: { type: String, index: true },
  customer: String,
  dealer: { type: String, index: true },
  description: String,
  detection: { type: String, default: 'Unknown' },
  division: String,
  failDate: Date,
  failedPart: String,
  failedPartCode: { type: String, index: true },
  theme: { type: String, default: 'Unknown' },
  themeOriginal: { type: String, default: null },
  hours: Number,
  hoursBucket: String,
  model: { type: String, index: true },
  vettersNotes: String,
  claimOutcome: { type: String, index: true },
  tPeriod: { type: String, index: true },
  vettedBy: String,
  vettedDate: { type: Date, index: true },
  partSupplier: { type: String, index: true },
  buildToFailDays: Number,
  descriptionTokens: { type: [String], default: [] },
  descriptionBigrams: { type: [String], default: [] },
  descriptionTags: { type: [String], default: [], index: true },
  regime: { type: String, enum: ['pre-2025', 'post-2025', 'unvetted'], index: true },
  ingestedAt: { type: Date, default: () => new Date() }
}, { _id: false, collection: 'claims', minimize: false });

ClaimSchema.index({ vettedBy: 1, vettedDate: 1 });
ClaimSchema.index({ description: 'text' });

export const Claim = model('Claim', ClaimSchema);

const UploadSchema = new Schema({
  filename: String,
  size: Number,
  received: Number,
  inserted: Number,
  skippedDuplicates: Number,
  parseErrors: Number,
  errorSamples: [String],
  startedAt: Date,
  finishedAt: Date,
  durationMs: Number
}, { collection: 'uploads' });

export const UploadLog = model('UploadLog', UploadSchema);

/**
 * FilterGroup - a user-defined named grouping of values for one filter
 * dimension. e.g. dimension='model', name='Ag', values=['540V140','535V125',...].
 *
 * When the user picks an Ag group in the dashboard filter dropdown, the
 * client expands it back to the individual values and writes them to the
 * URL. The backend never sees the group name - it just sees a multi-value
 * filter, which keeps every existing analytics endpoint untouched.
 */
const FilterGroupSchema = new Schema({
  dimension: {
    type: String,
    required: true,
    enum: ['model', 'country', 'supplier', 'area', 'tPeriod', 'outcome', 'dealer', 'vetter', 'theme', 'customer', 'tags'],
    index: true
  },
  name: { type: String, required: true, trim: true },
  values: { type: [String], required: true, default: [] },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
}, { collection: 'filter_groups', minimize: false });

// One (dimension, name) pair per group - prevents duplicate "Ag" groups in
// the same dimension. Across dimensions, names CAN repeat (e.g. "EU" for
// both country and customer if the user wants).
FilterGroupSchema.index({ dimension: 1, name: 1 }, { unique: true });

export const FilterGroup = model('FilterGroup', FilterGroupSchema);
