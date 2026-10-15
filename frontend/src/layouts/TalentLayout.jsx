import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, ExternalLink, FileText, Home, LogOut, Megaphone, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { Avatar, PageLoader } from '../components/ui/Primitives';
import Logo from '../components/public/Logo';
import { InstallBanner } from '../components/pwa/PwaPrompts';
import { cx } from '../lib/format';

const NAV = [
  { to: '/talent', label: 'Home', icon: Home, match: (p) => p === '/talent' },
  { to: '/talent/castings', label: 'Castings', icon: Megaphone, match: (p) => p.startsWith('/talent/castings') },
  { to: '/talent/bookings', label: 'Bookings', icon: CalendarCheck, match: (p) => p.startsWith('/talent/bookings') },
  { to: '/talent/profile', label: 'Profile', icon: UserRound, match: (p) => p.startsWith('/talent/profile') },
  { to: '/talent/documents', label: 'Documents', icon: FileText, match: (p) => p.startsWith('/talent/documents') },
];

function Shell() {
  const { user, logout, mfaSetupRequired } = useAuth();
  const { setTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (user?.preferences?.theme) setTheme(user.preferences.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => setMenu(false), [pathname]);

  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  if (mfaSetupRequired && pathname !== '/talent/account/setup-mfa') return <Navigate to="/talent/account/setup-mfa" replace />;

  const signOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-app-bg text-app-text">
      <a href="#talent-main" className="sr-only z-[100] rounded-full bg-app-text px-4 py-2 text-app-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-app-border bg-app-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-3 px-4 sm:px-6">
          <Logo tone="app" compact />
          <span className="hidden rounded-full bg-app-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-subtle xl:inline">Talent portal</span>
          <nav aria-label="Talent portal" className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map(({ to, label, icon: Icon, match }) => (
              <Link
                key={to}
                to={to}
                aria-current={match(pathname) ? 'page' : undefined}
                className={cx('flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition', match(pathname) ? 'bg-app-text text-app-bg' : 'text-app-subtle hover:bg-app-muted hover:text-app-text')}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </Link>
            ))}
          </nav>
          <div ref={menuRef} className="relative ml-auto lg:ml-2">
            <button type="button" onClick={() => setMenu((o) => !o)} aria-haspopup="menu" aria-expanded={menu} className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-app-muted">
              <Avatar name={user?.fullName} photo={user?.photo} size={32} />
              <span className="hidden max-w-[140px] truncate text-sm font-medium md:block">{user?.firstName}</span>
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 mt-2 w-64 animate-scale-in overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-lift">
                <div className="border-b border-app-border px-4 py-3">
                  <p className="truncate text-sm font-semibold">{user?.fullName}</p>
                  <p className="truncate text-xs text-app-subtle">{user?.organization || user?.email}</p>
                </div>
                <div className="p-1.5">
                  <Link role="menuitem" to="/talent/account" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-app-muted">
                    <UserRound className="h-4 w-4 text-app-subtle" /> Account & security
                  </Link>
                  <a role="menuitem" href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-app-muted">
                    <ExternalLink className="h-4 w-4 text-app-subtle" /> Studio website
                  </a>
                  <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

    <main id="talent-main" className="mx-auto w-full min-w-0 max-w-[1180px] flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-10 lg:pb-16">
        <InstallBanner message="See new casting calls and confirm bookings from your home screen." />
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="hidden border-t border-app-border py-6 text-center text-xs text-app-subtle lg:block">
        Royal Bee Film Studios · Questions about a job? Message the team from the booking.
      </footer>

      {/* Phone bottom bar */}
      <nav aria-label="Talent portal" className="fixed inset-x-0 bottom-0 z-40 border-t border-app-border bg-app-surface/95 pb-safe backdrop-blur lg:hidden">
        <ul className="flex">
          {NAV.map(({ to, label, icon: Icon, match }) => (
            <li key={to} className="min-w-0 flex-1">
              <NavLink to={to} aria-current={match(pathname) ? 'page' : undefined} className={cx('flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold', match(pathname) ? 'text-app-text' : 'text-app-subtle')}>
                <Icon className={cx('h-5 w-5', match(pathname) && 'text-app-accent')} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Talent-only area: requires a signed-in talent account. Others are sent to their own area. */
export default function TalentLayout() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-100">
        <PageLoader label="Restoring your session…" />
      </div>
    );
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user?.accountType === 'staff') return <Navigate to="/admin" replace />;
  if (user?.accountType === 'client') return <Navigate to="/portal" replace />;
  if (user?.accountType !== 'talent') return <Navigate to="/" replace />;

  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}