import ContentList from '../../../features/admin/ContentList';

export default function NewsAdminPage() {
  return (
    <ContentList
      resource="/cms/news"
      basePath="/admin/website/news"
      publicPath="/news"
      title="News"
      description="Public news and announcements. Internal staff announcements are a separate module."
      newLabel="New article"
      subtitle={(n) => n.category}
    />
  );
}
