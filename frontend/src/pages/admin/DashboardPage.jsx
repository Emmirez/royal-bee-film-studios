import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, CircleAlert, Clock, Film, Inbox, Layers, MessageSquare, Newspaper, Plug } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { Card, ErrorState, PageHeader, PageLoader, StatusBadge } from '../../components/ui/Primitives';
import Button from '../../components/ui/Button';
import { api } from '../../lib/api';
import { P } from '../../lib/permissions';
import { timeAgo, titleCase } from '../../lib/format';

function Stat({ label, value, icon: Icon, to, tone }) {
  const body = (
    <div className="card flex items-center gap-4 p-5 transition hover:shadow-lift">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone || 'bg-app-muted text-app-subtle'}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="font-display text-3xl font-semibold tabular leading-none">{value ?? '—'}</p>
        <p className="mt-1 text-sm text-app-subtle">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function ContentChart({ content }) {
  const rows = ['services', 'productions', 'news', 'sections'].map((k) => ({
    name: titleCase(k),
    Published: content[k]?.published || 0,
    'In review': content[k]?.in_review || 0,
    Draft: (content[k]?.draft || 0) + (content[k]?.approved || 0),
  }));
  return (
    <div className="h-64" role="img" aria-label="Website content by status">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgb(var(--app-subtle))' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'rgb(var(--app-subtle))' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'rgb(var(--app-muted))' }} contentStyle={{ background: 'rgb(var(--app-surface))', border: '1px solid rgb(var(--app-border))', borderRadius: 12, fontSize: 12 }} />
          <Bar dataKey="Published" stackId="a" fill="#2f7d5b" radius={[0, 0, 4, 4]} />
          <Bar dataKey="In review" stackId="a" fill="#c9a961" />
          <Bar dataKey="Draft" stackId="a" fill="#9a9286" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
          <div className="sr-only">
      <table>
        <caption>Website content by status</caption>
        <thead>
          <tr>
            <th>Type</th>
            <th>Published</th>
            <th>In review</th>
            <th>Draft</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.Published}</td>
              <td>{r['In review']}</td>
              <td>{r.Draft}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, can } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'overview'], queryFn: async () => (await api.get('/admin/overview')).data });
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const c = data.content;
  const e = data.enquiries;
  const sys = data.system;

  return (
    <>
      <PageHeader eyebrow="Dashboard" title={`${greeting}, ${user.firstName}`} description="Here’s what needs your attention across the studio website." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {e && <Stat label="New enquiries" value={e.new} icon={Inbox} to="/admin/enquiries?status=new" tone="bg-gold-500/15 text-gold-700 dark:text-gold-300" />}
        {e && <Stat label="Unassigned enquiries" value={e.unassigned} icon={CircleAlert} to="/admin/enquiries?assignedTo=unassigned" />}
        {e && <Stat label="Unread messages" value={e.unreadMessages} icon={MessageSquare} to="/admin/messages" />}
        {c && <Stat label="Awaiting review" value={c.awaitingReview} icon={Clock} tone="bg-status-warning/15 text-status-warning" />}
        {c && !e && <Stat label="Published productions" value={c.productions.published || 0} icon={Film} to="/admin/website/productions" />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {c && (
          <Card title="Website content" description="Items by workflow status" actions={<Button to="/admin/website" size="sm" variant="ghost" iconRight={ArrowRight}>Manage</Button>}>
            <ContentChart content={c} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['Hero video', c.hero, '/admin/website/hero'],
                ['Founder profile', c.founder, '/admin/website/founder'],
              ].map(([label, s, to]) => (
                <Link key={label} to={to} className="flex items-center justify-between rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-muted">
                  <span className="font-medium">{label}</span>
                  <StatusBadge status={!s?.hasUnpublishedChanges ? 'published' : s.reviewStatus === 'editing' ? 'draft' : s.reviewStatus} label={!s?.hasUnpublishedChanges ? 'Live' : s.reviewStatus === 'editing' ? 'Unpublished edits' : undefined} />
                </Link>
              ))}
            </div>
          </Card>
        )}

        {e && (
          <Card title="Latest enquiries" description={`${e.last30Days} in the last 30 days`} actions={<Button to="/admin/enquiries" size="sm" variant="ghost" iconRight={ArrowRight}>All</Button>} bodyClassName="p-0">
            {e.recent.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-app-subtle">No enquiries yet.</p>
            ) : (
              <ul className="divide-y divide-app-border">
                {e.recent.map((r) => (
                  <li key={r._id}>
                    <Link to={`/admin/enquiries/${r._id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-app-muted">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.contact?.name}</p>
                        <p className="truncate text-xs text-app-subtle">
                          {r.reference} · {r.serviceTitle || 'General'} · {timeAgo(r.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {(c || sys) && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {c && can(P.CMS_EDIT) && (
            <Card title="Quick actions">
              <div className="grid grid-cols-2 gap-2">
                <Button to="/admin/website/productions/new" variant="secondary" icon={Film} className="justify-center">New production</Button>
                <Button to="/admin/website/news/new" variant="secondary" icon={Newspaper} className="justify-center">New article</Button>
                <Button to="/admin/website/ticker" variant="secondary" className="justify-center">Edit ticker</Button>
                <Button to="/admin/website/services" variant="secondary" icon={Layers} className="justify-center">Services</Button>
              </div>
            </Card>
          )}
          {sys && (
            <Card title="System health" actions={<Button to="/admin/integrations" size="sm" variant="ghost" icon={Plug}>Integrations</Button>}>
              <ul className="space-y-3 text-sm">
                {[
                  ['Database', sys.database === 'connected'],
                  ['Cloudinary (media)', sys.cloudinary === 'configured'],
                  ['Brevo (email)', sys.brevo === 'configured'],
                  ['Email failures (24h)', sys.failedEmails24h === 0, sys.failedEmails24h],
                ].map(([label, okay, extra]) => (
                  <li key={label} className="flex items-center justify-between">
                    <span>{label}</span>
                    <span className={`inline-flex items-center gap-1.5 font-medium ${okay ? 'text-status-success' : 'text-status-warning'}`}>
                      {okay ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                      {extra !== undefined ? extra : okay ? 'OK' : 'Setup needed'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
