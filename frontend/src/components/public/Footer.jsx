import { Link } from 'react-router-dom';
import { Instagram, Youtube, Facebook, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import Logo from './Logo';
import DeveloperCredit from './DeveloperCredit';
import { usePublicSettings } from '../../features/public/publicApi';
import { PRIMARY_LINKS } from './navigation';

const SOCIAL_ICONS = { instagram: Instagram, youtube: Youtube, facebook: Facebook, linkedin: Linkedin };

export default function Footer() {
  const { data: s } = usePublicSettings();
  const social = Object.entries(s?.social || {}).filter(([, url]) => url);
  const year = new Date().getFullYear();

  return (
      <footer className="relative overflow-hidden rounded-t-[32px] bg-ink-950 pb-28 pt-20 text-paper-200 sm:rounded-t-[48px] lg:pb-12">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-gold-600/10 blur-3xl" aria-hidden />
      <div className="container-site relative">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo light src={s?.logo?.url || '/logo.png'} />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-paper-300/80">
              {s?.footer?.blurb || 'A film production studio telling bold, beautifully crafted stories.'}
            </p>
              <Link
              to="/partner"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold-400/60 px-5 py-2.5 text-sm font-semibold text-gold-300 transition hover:bg-gold-500 hover:text-ink-950"
            >
              Partner with us →
            </Link>
            {social.length > 0 && (
              <ul className="mt-6 flex gap-2">
                {social.map(([key, url]) => {
                  const Icon = SOCIAL_ICONS[key];
                  return (
                    <li key={key}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-paper-200 transition hover:border-gold-400 hover:text-gold-300"
                        aria-label={key}
                      >
                        {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs uppercase">{key.slice(0, 2)}</span>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-300">Explore</h2>
            <ul className="space-y-3 text-sm">
              {PRIMARY_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-paper-300/85 transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-300">Studio</h2>
            <ul className="space-y-3 text-sm">
              <li><Link to="/enquire" className="text-paper-300/85 hover:text-white">Start a project</Link></li>
              <li><Link to="/partner" className="text-paper-300/85 hover:text-white">Partner with us</Link></li>
              <li><Link to="/join-talent" className="text-paper-300/85 hover:text-white">Join our talent roster</Link></li>
              <li><Link to="/search" className="text-paper-300/85 hover:text-white">Search</Link></li>
              <li><Link to="/login" className="text-paper-300/85 hover:text-white">Sign in</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-300">Contact</h2>
            <ul className="space-y-3 text-sm text-paper-300/85">
              {s?.contact?.email && (
                <li className="flex gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden />
                  <a href={`mailto:${s.contact.email}`} className="hover:text-white">{s.contact.email}</a>
                </li>
              )}
              {s?.contact?.phone && (
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden />
                  <a href={`tel:${s.contact.phone.replace(/\s/g, '')}`} className="hover:text-white">{s.contact.phone}</a>
                </li>
              )}
              {(s?.contact?.address || s?.contact?.city) && (
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden />
                  <span>{[s.contact.address, s.contact.city, s.contact.country].filter(Boolean).join(', ')}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

          <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-paper-300/60 sm:flex-row sm:items-center sm:justify-between">
          <p>{(s?.footer?.copyright || '© {year} Royal Bee Film Studios. All rights reserved.').replaceAll('{year}', year)}</p>
          <DeveloperCredit />
        </div>
      </div>
    </footer>
  );
}
