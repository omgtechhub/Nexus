import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAccountProfileQuery, useUpdateAccountProfileMutation } from '../../../hooks/useAccount';
import { LoadingState, ErrorState, PageHeading } from '../components/States';

export function CustomerProfile() {
  const { data: profile, isLoading, isError, error, refetch } = useAccountProfileQuery();
  const updateProfile = useUpdateAccountProfileMutation();
  const [name, setName] = useState('');

  // Seed the field once the profile arrives, without clobbering an edit in flight.
  useEffect(() => {
    if (profile && !updateProfile.isPending) setName(prev => (prev === '' ? profile.name : prev));
  }, [profile, updateProfile.isPending]);

  if (isLoading) return <LoadingState label="Loading your profile…" />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;
  if (!profile) return <ErrorState message="Profile unavailable." />;

  const dirty = name.trim() !== profile.name && name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    updateProfile.mutate(
      { name: name.trim() },
      {
        onSuccess: () => toast.success('Profile updated'),
        onError: (err: any) => toast.error(err?.message || 'Could not update your profile'),
      }
    );
  };

  return (
    <>
      <PageHeading title="Profile" subtitle="How your name appears on orders you place." />

      <div className="max-w-lg space-y-6">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5 sm:p-6">
          <div className="space-y-5">
            <Input
              label="Name"
              id="profile-name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              required
            />

            <div>
              <span className="mb-1.5 block text-sm font-medium text-body">Email address</span>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-3 py-2.5">
                <span className="text-sm text-secondary">{profile.email}</span>
                {profile.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-green-ink)]">
                    <CheckCircle2 size={12} aria-hidden="true" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-yellow-ink)]">
                    <AlertCircle size={12} aria-hidden="true" /> Not verified
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Your email identifies your orders across every merchant, so it cannot be
                changed here.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!dirty}
              loading={updateProfile.isPending}
            >
              Save changes
            </Button>
          </div>
        </form>

        <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5">
          <h2 className="text-sm font-semibold text-primary">Account</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Member since</dt>
              <dd className="text-body">
                {new Date(profile.createdAt).toLocaleDateString(undefined, {
                  month: 'long', year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
