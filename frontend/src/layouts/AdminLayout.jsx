import { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronsLeft, ChevronsRight, CircleHelp, ExternalLink, LogOut, Menu, Monitor, Moon, Search, Shield, Sun, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import CommandMenu from '../components/admin/CommandMenu';
import NotificationBell from '../components/admin/NotificationBell';
import { InstallBanner } from '../components/pwa/PwaPrompts';
import Drawer from '../components/ui/Drawer';
import { Avatar, PageLoader } from '../components/ui/Primitives';
import Logo from '../components/public/Logo';
import { mobileTabsFor, visibleNav } from '../features/admin/adminNav';
import { articleForPath, visibleGuide } from '../features/admin/help/guideContent';
import { api } from '../lib/api';
import { cx } from '../lib/format';

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('rb-sidebar') === '1';
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('rb-sidebar', c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  return [collapsed, toggle];
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

function NavList({ groups, collapsed, badges, onNavigate }) {
  return (
    <nav aria-label="Workspace" className="space-y-6">
      {groups.map((g) => (
        <div key={g.label}>
          {!collapsed && <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-app-subtle">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map(({ to, label, icon: Icon, end, badgeKey }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                      isActive ? 'bg-app-text text-app-bg' : 'text-app-subtle hover:bg-app-muted hover:text-app-text',
                      collapsed && 'justify-center px-0',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cx('h-[18px] w-[18px] shrink-0', isActive && 'text-app-accent')} aria-hidden fill={isActive ? 'currentColor' : 'none'} fillOpacity={isActive ? 0.15 : 0} />
                      {!collapsed && <span className="flex-1 truncate">{label}</span>}
                      {!collapsed && badgeKey && badges?.[badgeKey] > 0 && (
                        <span className="rounded-full bg-app-accent px-2 py-0.5 text-[10px] font-bold text-app-accent-ink tabular">{badges[badgeKey]}</span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ThemeSwitcher() {
  const { preference, setTheme } = useTheme();
  const options = [
    { value: 'light', icon: Sun, label: 'Light theme' },
    { value: 'dark', icon: Moon, label: 'Dark theme' },
    { value: 'system', icon: Monitor, label: 'Match system' },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-full bg-app-muted p-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          onClick={() => {
            setTheme(value);
            api.patch('/auth/me/preferences', { theme: value }).catch(() => {});
          }}
          className={cx('rounded-full p-1.5', preference === value ? 'bg-app-surface text-app-text shadow-soft' : 'text-app-subtle')}
          aria-label={label}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

function Shell() {
  const { user, can, logout, mfaSetupRequired } = useAuth();
  const { setTheme } = useTheme();
  const [collapsed, toggleCollapsed] = useCollapsed();
  const [moreOpen, setMoreOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const online = useOnline();
  const groups = visibleNav(can);
  // "Help" opens the guide on the topic for the page you're on
  const helpTopic = articleForPath(visibleGuide(can), pathname);
  const helpLink = helpTopic ? `/admin/help?topic=${helpTopic}` : '/admin/help';

  const { data: overview } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => (await api.get('/admin/overview')).data,
    refetchInterval: 60_000,
    enabled: !mfaSetupRequired,
  });
  const badges = { newEnquiries: overview?.enquiries?.new, unreadMessages: overview?.enquiries?.unreadMessages };

  // Apply the user's saved theme preference once.
  useEffect(() => {
    if (user?.preferences?.theme) setTheme(user.preferences.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    setMoreOpen(false);
    setUserMenu(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (mfaSetupRequired && pathname !== '/admin/security/setup-mfa') return <Navigate to="/admin/security/setup-mfa" replace />;

  const mobileTabs = mobileTabsFor(can);

  return (
        <div className="min-h-screen overflow-x-clip bg-app-bg text-app-text">
      <a href="#admin-main" className="sr-only z-[100] rounded-full bg-app-text px-4 py-2 text-app-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      {!mfaSetupRequired && (
        <aside className={cx('fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-app-border bg-app-surface transition-all lg:flex', collapsed ? 'w-[76px]' : 'w-[264px]')}>
          <div className={cx('flex h-16 items-center border-b border-app-border', collapsed ? 'justify-center' : 'px-5')}>
            {collapsed ? <span className="font-display text-xl font-semibold">RB</span> : <Logo tone="app" showWordmark className="[&_img]:h-8" />}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-5">
            <NavList groups={groups} collapsed={collapsed} badges={badges} />
          </div>
          <button type="button" onClick={toggleCollapsed} className="flex items-center gap-2 border-t border-app-border px-5 py-3 text-xs font-semibold text-app-subtle hover:text-app-text" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronsRight className="mx-auto h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
          </button>
        </aside>
      )}

        <div className={cx('flex min-h-screen min-w-0 flex-col transition-all', !mfaSetupRequired && (collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]'))}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-app-border bg-app-bg/90 px-4 backdrop-blur sm:px-6">
                    <div className="flex min-w-0 items-center gap-2 lg:hidden">
            {!mfaSetupRequired && (
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-app-text hover:bg-app-muted"
                aria-label="Open menu"
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <Logo tone="app" compact />
          </div>
          {!mfaSetupRequired && (
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="ml-auto flex h-10 items-center gap-2 rounded-full border border-app-border bg-app-surface px-3 text-sm text-app-subtle hover:text-app-text lg:ml-0 lg:w-80"
              aria-label="Open command menu"
            >
              <Search className="h-4 w-4" aria-hidden />
              <span className="hidden lg:inline">Search or jump to…</span>
              <kbd className="ml-auto hidden rounded-md border border-app-border px-1.5 text-[10px] lg:inline">Ctrl K</kbd>
            </button>
          )}
            <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-auto">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden rounded-full p-2 text-app-subtle hover:bg-app-muted hover:text-app-text sm:block" aria-label="View public website" title="View website">
            <ExternalLink className="h-4 w-4" />
            </a>
              {!mfaSetupRequired && (
              <Link to={helpLink} className="hidden rounded-full p-2 text-app-subtle hover:bg-app-muted hover:text-app-text sm:block" aria-label="Help for this page" title="Help & guide">
                <CircleHelp className="h-5 w-5" />
              </Link>
            )}
            {!mfaSetupRequired && <NotificationBell />}
            <div className="relative">
              <button type="button" onClick={() => setUserMenu((o) => !o)} aria-haspopup="menu" aria-expanded={userMenu} className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-app-muted">
                <Avatar name={user?.fullName} photo={user?.photo} size={32} />
                <span className="hidden max-w-[140px] truncate text-sm font-medium md:block">{user?.firstName}</span>
              </button>
              {userMenu && (
                <div role="menu" className="absolute right-0 mt-2 w-64 animate-scale-in overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-lift">
                  <div className="border-b border-app-border px-4 py-3">
                    <p className="truncate text-sm font-semibold">{user?.fullName}</p>
                    <p className="truncate text-xs text-app-subtle">{user?.role?.name}</p>
                  </div>
                  <div className="p-1.5">
                    <Link role="menuitem" to="/admin/security" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-app-muted">
                      <Shield className="h-4 w-4 text-app-subtle" /> Account & security
                    </Link>
                    <div className="px-3 py-2 sm:hidden">
                      <ThemeSwitcher />
                    </div>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={async () => {
                        await logout();
                        navigate('/login');
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {!online && (
          <div role="status" className="flex items-center gap-2 bg-status-warning/15 px-6 py-2 text-sm text-status-warning">
            <WifiOff className="h-4 w-4" aria-hidden /> You’re offline. Changes can’t be saved until your connection returns.
          </div>
        )}

          <main id="admin-main" className="min-w-0 flex-1 overflow-x-clip px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
            <div className="mx-auto w-full min-w-0 max-w-[1280px]">
            {!mfaSetupRequired && <InstallBanner />}
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

         {/* Mobile bottom navigation — rendered straight into <body> so it always stays pinned to the bottom */}
      {!mfaSetupRequired && createPortal(
        <nav aria-label="Workspace" className="fixed inset-x-0 bottom-0 z-40 border-t border-app-border bg-app-surface/95 backdrop-blur pb-safe lg:hidden">
              <ul className="mx-auto flex max-w-md">
              {mobileTabs.map(({ to, label, icon: Icon, end }) => (
                <li key={to} className="min-w-0 flex-1">
                <NavLink to={to} end={end} className={({ isActive }) => cx('flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold', isActive ? 'text-app-text' : 'text-app-subtle')}>
                  {({ isActive }) => (
                    <>
                      <Icon className={cx('h-5 w-5', isActive && 'text-app-accent')} aria-hidden fill={isActive ? 'currentColor' : 'none'} fillOpacity={isActive ? 0.2 : 0} />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
              <li className="min-w-0 flex-1">
              <button type="button" onClick={() => setMoreOpen(true)} className="flex w-full flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold text-app-subtle" aria-haspopup="dialog">
                <Menu className="h-5 w-5" aria-hidden /> More
              </button>
            </li>
          </ul>
              </nav>,
        document.body,
      )}

      <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} side="bottom" title="Workspace">
        <NavList groups={groups} badges={badges} onNavigate={() => setMoreOpen(false)} />
      </Drawer>

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}

/** Staff-only area: requires a signed-in staff account. */
export default function AdminLayout() {
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
  if (user?.accountType === 'client') return <Navigate to="/portal" replace />;
  if (user?.accountType === 'talent') return <Navigate to="/talent" replace />;
  if (user?.accountType !== 'staff') return <Navigate to="/" replace />;

  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}
