import mongoose from 'mongoose';

/** Aggregate, privacy-conscious public search analytics (no IPs or user identifiers). */
const searchStatSchema = new mongoose.Schema({
  term: { type: String, required: true, lowercase: true, trim: true, maxlength: 100 },
  date: { type: String, required: true }, // YYYY-MM-DD
  count: { type: Number, default: 0 },
  zeroResultCount: { type: Number, default: 0 },
});
searchStatSchema.index({ term: 1, date: 1 }, { unique: true });
searchStatSchema.index({ date: -1, count: -1 });

export const SearchStat = mongoose.model('SearchStat', searchStatSchema);
