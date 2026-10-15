import { useState, useSyncExternalStore } from 'react';
import { Download, PlusSquare, RefreshCw, Share, X } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

/* ───────── Install + update state ───────── */
let state = { installEvent: null, updateReady: false };
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const usePwa = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => state);

let waitingWorker = null;
let reloadOnChange = false;
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Call once in main.jsx, before React renders. Registers the service worker in production only. */
export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own "Install app" button instead
    set({ installEvent: e });
  });
  window.addEventListener('appinstalled', () => set({ installEvent: null }));
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        const ready = (w) => {
          waitingWorker = w;
          set({ updateReady: true });
        };
        if (reg.waiting && navigator.serviceWorker.controller) ready(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w?.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) ready(w); // an update, not the first install
          });
        });
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000); // check hourly while open
      })
      .catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadOnChange) window.location.reload();
    });
  });
}

/* ───────── "Install Royal Bee" card (dashboard + portals) ───────── */
const DISMISS_KEY = 'rb-install-dismissed-at';
const recentlyDismissed = () => {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 30 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

export function InstallBanner({ message = 'Open it from your home screen like an app — full screen, faster, and you stay signed in.' }) {
  const { installEvent } = usePwa();
  const [hidden, setHidden] = useState(recentlyDismissed);
  const [iosHelp, setIosHelp] = useState(false);
  const ios = isIos();
  if (hidden || isStandalone() || (!installEvent && !ios)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private browsing */
    }
    setHidden(true);
  };
  const install = async () => {
    if (ios) return setIosHelp(true);
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    set({ installEvent: null });
    if (outcome === 'dismissed') dismiss();
  };
  const label = ios ? 'How to install' : 'Install app';

  return (
    <>
      <div role="region" aria-label="Install the app" className="mb-6 flex items-start gap-3 rounded-2xl border border-app-border bg-app-surface p-4 sm:items-center sm:gap-4">
        <img src="/android-chrome-192x192.png" alt="" width="44" height="44" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-app-text">Install Royal Bee on this device</p>
          <p className="mt-0.5 text-sm text-app-subtle">{message}</p>
          <Button size="sm" icon={Download} onClick={install} className="mt-3 sm:hidden">
            {label}
          </Button>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Not now
          </Button>
          <Button size="sm" icon={Download} onClick={install}>
            {label}
          </Button>
        </div>
        <button type="button" onClick={dismiss} aria-label="Not now" className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-app-subtle hover:bg-app-muted hover:text-app-text sm:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Modal open={iosHelp} onClose={() => setIosHelp(false)} title="Add Royal Bee to your Home Screen" size="sm" footer={<Button onClick={() => setIosHelp(false)}>Got it</Button>}>
        <ol className="space-y-4 text-sm text-app-text">
          {[
            <>Tap the <strong>Share</strong> button <Share className="inline h-4 w-4 align-[-3px]" aria-hidden /> in Safari’s toolbar.</>,
            <>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline h-4 w-4 align-[-3px]" aria-hidden />.</>,
            <>Tap <strong>Add</strong>. Royal Bee now opens from your Home Screen like an app.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-muted text-xs font-semibold">{i + 1}</span>
              <span className="min-w-0 pt-1">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs text-app-subtle">Don’t see “Add to Home Screen”? Open this page in Safari first.</p>
      </Modal>
    </>
  );
}

/* ───────── "New version ready" bar (whole site) ───────── */
export function UpdateBanner() {
  const { updateReady } = usePwa();
  const [busy, setBusy] = useState(false);
  if (!updateReady) return null;

  const refresh = () => {
    setBusy(true);
    if (!waitingWorker) return window.location.reload();
    reloadOnChange = true;
    waitingWorker.postMessage('SKIP_WAITING');
  };

  return (
    <div role="status" className="fixed inset-x-3 bottom-24 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-paper-50 shadow-2xl lg:bottom-6">
      <RefreshCw className="h-4 w-4 shrink-0 text-gold-300" aria-hidden />
      <p className="min-w-0 flex-1 text-sm">A new version of Royal Bee is ready.</p>
      <button type="button" onClick={() => set({ updateReady: false })} className="shrink-0 rounded-full px-2 py-1.5 text-sm text-paper-300 hover:text-paper-50">
        Later
      </button>
      <button type="button" disabled={busy} onClick={refresh} className="shrink-0 rounded-full bg-gold-500 px-4 py-1.5 text-sm font-semibold text-ink-950 hover:bg-gold-400 disabled:opacity-60">
        {busy ? 'Updating…' : 'Refresh'}
      </button>
    </div>
  );
}