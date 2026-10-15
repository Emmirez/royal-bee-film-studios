export function slugify(text = '') {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/** Return a slug that is unique within the given model. */
export async function uniqueSlug(Model, base, excludeId) {
  const root = slugify(base) || 'item';
  let candidate = root;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    candidate = `${root}-${n++}`;
  }
  return candidate;
}
