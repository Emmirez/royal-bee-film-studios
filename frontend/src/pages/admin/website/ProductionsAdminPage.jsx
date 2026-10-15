import ContentList from '../../../features/admin/ContentList';

export default function ProductionsAdminPage() {
  return (
    <ContentList
      resource="/cms/productions"
      basePath="/admin/website/productions"
      publicPath="/productions"
      title="Productions"
      description="Portfolio entries. Visibility controls whether a published production is listed, link-only, or private."
      newLabel="New production"
      subtitle={(p) => [p.category, p.year, p.visibility !== 'public' && p.visibility].filter(Boolean).join(' · ')}
    />
  );
}
