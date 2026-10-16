import { MessageCircle } from 'lucide-react';

// Developer credit — hardcoded on purpose (not editable from the dashboard).
const WHATSAPP_NUMBER = '2348064018967'; // 0806 401 8967 in international format, no "+"
const MESSAGE = 'Hi Emmirez, I saw the Royal Bee Film Studios website and I’d like to talk about a project.';

/** "Designed & developed by Emmirez Obaro" — opens a WhatsApp chat with a ready-made message. */
export default function DeveloperCredit() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Designed and developed by Emmirez Obaro — chat on WhatsApp"
      className="group inline-flex max-w-full items-center gap-2.5 self-start rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-4 text-xs text-paper-300/70 transition hover:border-gold-400/60 hover:bg-gold-500/10 hover:text-paper-50 sm:self-auto"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-300 transition group-hover:bg-gold-500 group-hover:text-ink-950">
        <MessageCircle className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="min-w-0">
        Designed &amp; developed by{' '}
        <span className="font-semibold text-gold-300 transition group-hover:text-gold-200">Emmirez Obaro</span>
      </span>
    </a>
  );
}