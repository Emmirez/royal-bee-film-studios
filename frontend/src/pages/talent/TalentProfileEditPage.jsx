import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import { Card, ErrorState, PageLoader } from '../../components/ui/Primitives';
import { PhotoManager, ProfileFields, formToBody, profileToForm } from '../../features/talent/talentUi';
import { useToast } from '../../context/ToastContext';
import { api, ApiRequestError } from '../../lib/api';

/** Talent: edit my profile and photos. */
export default function TalentProfileEditPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const key = ['talent', 'profile'];
  const { data: profile, isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: async () => (await api.get('/talent-portal/profile')).data });
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (profile && !form) setForm(profileToForm(profile));
  }, [profile, form]);

  const applyProfile = (p) => {
    qc.setQueryData(key, p);
    qc.invalidateQueries({ queryKey: ['talent', 'overview'] });
  };
  const save = useMutation({ mutationFn: (body) => api.patch('/talent-portal/profile', body).then((r) => r.data), onSuccess: applyProfile });

  if (isLoading || (!form && !error)) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const submit = async () => {
    setErrors({});
    try {
      await save.mutateAsync(formToBody(form));
      toast.success('Profile saved');
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.fieldErrors);
      toast.error(err.message);
    }
  };

  const savePhotos = async (photos) => {
    try {
      await save.mutateAsync({ photos });
      toast.success('Photos updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <Seo title="My profile" noIndex />
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">My profile</h1>
          <p className="mt-2 max-w-2xl text-app-subtle">Your profile is private — only the Royal Bee team sees it when casting. Keep your photos and availability up to date.</p>
        </div>
        <Button icon={Save} loading={save.isPending} onClick={submit}>
          Save profile
        </Button>
      </div>

      <div className="space-y-6">
        <Card title="Photos" description="Changes to photos save straight away.">
          <PhotoManager photos={profile.photos} uploadPath="/talent-portal/profile/photos" onUploaded={applyProfile} onChange={savePhotos} busy={save.isPending} />
        </Card>
        <Card>
          <ProfileFields form={form} setForm={setForm} errors={errors} />
          <div className="mt-8 flex justify-end border-t border-app-border pt-5">
            <Button icon={Save} loading={save.isPending} onClick={submit}>
              Save profile
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}