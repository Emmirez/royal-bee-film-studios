import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Seo from '../../components/public/Seo';
import { Card, ErrorState, PageLoader } from '../../components/ui/Primitives';
import { DocumentList, DocumentUploader } from '../../features/talent/talentUi';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';

/** Talent: my private documents (contracts, release forms, ID). */
export default function TalentDocumentsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['talent', 'documents'], queryFn: async () => (await api.get('/talent-portal/documents')).data });
  const { data: bookings } = useQuery({ queryKey: ['talent', 'bookings'], queryFn: async () => (await api.get('/talent-portal/bookings')).data });
  const remove = useMutation({ mutationFn: (docId) => api.del(`/talent-portal/documents/${docId}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['talent', 'documents'] }) });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const docs = data || [];

  return (
    <>
      <Seo title="Documents" noIndex />
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">Documents</h1>
      <p className="mb-6 mt-2 max-w-2xl text-app-subtle">Private files shared between you and the studio. Download links work for 5 minutes at a time.</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card title="Your documents" className="min-w-0">
          <DocumentList
            documents={docs}
            downloadPath={(d) => `/talent-portal/documents/${d.id}/download`}
            canDelete={(d) => d.fromTalent}
            onDelete={async (d) => {
              if (!(await confirm({ title: `Delete “${d.title}”?`, tone: 'danger', confirmLabel: 'Delete' }))) return;
              remove.mutateAsync(d.id).then(() => toast.success('Deleted')).catch((e) => toast.error(e.message));
            }}
            emptyText="No documents yet. Signed contracts and forms will appear here."
          />
        </Card>
        <Card title="Upload a document" className="min-w-0">
          <DocumentUploader
            path="/talent-portal/documents"
            bookings={(bookings || []).filter((b) => ['offered', 'confirmed', 'completed'].includes(b.status))}
            onUploaded={() => qc.invalidateQueries({ queryKey: ['talent', 'documents'] })}
          />
        </Card>
      </div>
    </>
  );
}