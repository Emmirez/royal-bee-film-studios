import mongoose from 'mongoose';

/** Atomic sequence counters (e.g. RBF-ENQ-2026-0001). Safe under concurrent requests. */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "ENQ-2026"
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);

export async function nextSequence(key) {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
}

export function formatReference(prefix, type, year, seq) {
  return `${prefix}-${type}-${year}-${String(seq).padStart(4, '0')}`;
}

export async function nextReference(type, prefix = 'RBF', date = new Date()) {
  const year = date.getFullYear();
  const seq = await nextSequence(`${type}-${year}`);
  return formatReference(prefix, type, year, seq);
}
