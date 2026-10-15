/** Labels seeded placeholder content so it is never mistaken for a real Royal Bee production. */
export default function SampleBadge({ show, className = '' }) {
  if (!show) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full bg-ink-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-100 backdrop-blur ${className}`}
      title="Sample content — replace in the CMS"
    >
      Sample
    </span>
  );
}
