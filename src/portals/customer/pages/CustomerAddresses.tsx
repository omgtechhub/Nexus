import { useState } from 'react';
import { MapPin, Plus, Trash2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  useAccountAddressesQuery,
  useCreateAccountAddressMutation,
  useDeleteAccountAddressMutation,
} from '../../../hooks/useAccount';
import type { NewAccountAddress } from '../../../api/account';
import { LoadingState, ErrorState, EmptyState, PageHeading } from '../components/States';

const BLANK: NewAccountAddress = {
  firstName: '', lastName: '', address1: '', address2: '',
  city: '', state: '', zip: '', country: '', isDefault: false,
};

export function CustomerAddresses() {
  const { data: addresses, isLoading, isError, error, refetch } = useAccountAddressesQuery();
  const createAddress = useCreateAccountAddressMutation();
  const deleteAddress = useDeleteAccountAddressMutation();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewAccountAddress>(BLANK);

  const set = (key: keyof NewAccountAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAddress.mutate(
      { ...form, address2: form.address2 || null },
      {
        onSuccess: () => {
          toast.success('Address saved');
          setForm(BLANK);
          setShowForm(false);
        },
        onError: (err: any) => toast.error(err?.message || 'Could not save that address'),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteAddress.mutate(id, {
      onSuccess: () => toast.success('Address removed'),
      onError: (err: any) => toast.error(err?.message || 'Could not remove that address'),
    });
  };

  if (isLoading) return <LoadingState label="Loading your addresses…" />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;

  const list = addresses ?? [];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeading title="Delivery addresses" subtitle="Where your orders get sent." />
        {!showForm && list.length > 0 && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} aria-hidden="true" />}
            onClick={() => setShowForm(true)}
          >
            Add address
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
        >
          <h2 className="mb-5 text-sm font-semibold text-white">New address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" id="addr-first" value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required />
            <Input label="Last name" id="addr-last" value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required />
            <div className="sm:col-span-2">
              <Input label="Address" id="addr-1" value={form.address1} onChange={set('address1')} autoComplete="address-line1" required />
            </div>
            <div className="sm:col-span-2">
              <Input label="Apartment, suite (optional)" id="addr-2" value={form.address2 ?? ''} onChange={set('address2')} autoComplete="address-line2" />
            </div>
            <Input label="City" id="addr-city" value={form.city} onChange={set('city')} autoComplete="address-level2" required />
            <Input label="State or region" id="addr-state" value={form.state} onChange={set('state')} autoComplete="address-level1" required />
            <Input label="Postal code" id="addr-zip" value={form.zip} onChange={set('zip')} autoComplete="postal-code" required />
            <Input label="Country" id="addr-country" value={form.country} onChange={set('country')} autoComplete="country-name" required />
          </div>

          <label className="mt-4 flex items-center gap-2.5 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={e => setForm(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#27C93F]"
            />
            Use this as my default delivery address
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" loading={createAddress.isPending}>
              Save address
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => { setShowForm(false); setForm(BLANK); }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {list.length === 0 && !showForm ? (
        <EmptyState
          icon={<MapPin size={20} aria-hidden="true" />}
          title="No saved addresses"
          description="Save an address to make checkout faster next time you order."
          action={
            <Button variant="primary" size="md" icon={<Plus size={14} aria-hidden="true" />} onClick={() => setShowForm(true)}>
              Add address
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map(address => (
            <li
              key={address.id}
              className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              {address.isDefault && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#27C93F]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#27C93F]">
                  <Star size={10} aria-hidden="true" /> Default
                </span>
              )}
              <address className="text-sm not-italic leading-relaxed text-white/70">
                <span className="font-medium text-white">
                  {address.firstName} {address.lastName}
                </span><br />
                {address.address1}<br />
                {address.address2 && <>{address.address2}<br /></>}
                {address.city}{address.state ? `, ${address.state}` : ''} {address.zip}<br />
                {address.country}
              </address>

              <button
                type="button"
                onClick={() => handleDelete(address.id)}
                aria-label={`Remove address for ${address.firstName} ${address.lastName}`}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-[#FF5F56]/10 hover:text-[#FF5F56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F56]"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
