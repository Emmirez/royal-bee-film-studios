import ContentList from '../../../features/admin/ContentList';

export default function ServicesAdminPage() {
  return (
    <ContentList
      resource="/cms/services"
      basePath="/admin/website/services"
      publicPath="/services"
      title="Services"
      description="Drag to set the order services appear on the website."
      sortable
      newLabel="New service"
      subtitle={(s) => s.summary}
    />
  );
}
