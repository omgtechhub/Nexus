import { useState } from 'react';
import { Globe, Plus, Trash2, AlertTriangle, RotateCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  useShippingZonesQuery,
  useCreateShippingZoneMutation,
  useDeleteShippingZoneMutation,
} from '../../hooks/useShipping';
import type { ShippingMethod } from '../../api/shipping';

type RateType = 'FLAT_RATE' | 'FREE_SHIPPING' | 'WEIGHT_BASED';

const RATE_LABELS: Record<RateType, string> = {
  FLAT_RATE: 'Flat rate',
  FREE_SHIPPING: 'Free shipping',
  WEIGHT_BASED: 'Weight based',
};

type DraftMethod = {
  name: string;
  rateType: RateType;
  price: string;
  estimatedDays: string;
};

const BLANK_METHOD: DraftMethod = { name: '', rateType: 'FLAT_RATE', price: '', estimatedDays: '' };

export function ShippingSection() {
  const { data: zones = [], isLoading, isError, error, refetch } = useShippingZonesQuery();
  const createZone = useCreateShippingZoneMutation();
  const deleteZone = useDeleteShippingZoneMutation();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [methods, setMethods] = useState<DraftMethod[]>([{ ...BLANK_METHOD }]);

  const reset = () => {
    setName('');
    setCountryInput('');
    setCountries([]);
    setMethods([{ ...BLANK_METHOD }]);
    setShowForm(false);
  };

  const addCountry = () => {
    const code = countryInput.trim().toUpperCase();
    if (!code) return;
    if (countries.includes(code)) {
      setCountryInput('');
      return;
    }
    setCountries(prev => [...prev, code]);
    setCountryInput('');
  };

  const setMethod = (index: number, patch: Partial<DraftMethod>) =>
    setMethods(prev => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (countries.length === 0) {
      toast.error('Add at least one country code');
      return;
    }

    const cleaned: ShippingMethod[] = methods
      .filter(m => m.name.trim())
      .map(m => ({
        id: '',
        name: m.name.trim(),
        rateType: m.rateType,
        // Free shipping is priced at zero regardless of what was typed.
        price: m.rateType === 'FREE_SHIPPING' ? 0 : parseFloat(m.price) || 0,
        estimatedDays: m.estimatedDays.trim() || undefined,
      }));

    if (cleaned.length === 0) {
      toast.error('Add at least one shipping method');
      return;
    }

    createZone.mutate(
      { name: name.trim(), countries, methods: cleaned },
      {
        onSuccess: () => {
          toast.success(`Zone "${name.trim()}" created`);
          reset();
        },
        onError: (err: any) => toast.error(err?.message || 'Could not create the zone'),
      }
    );
  };

  const handleDelete = (id: string, zoneName: string) => {
    deleteZone.mutate(id, {
      onSuccess: () => toast.success(`Zone "${zoneName}" deleted`),
      onError: (err: any) => toast.error(err?.message || 'Could not delete the zone'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-white/50" role="status">
        <RotateCw size={18} className="animate-spin" aria-hidden="true" />
        <span className="text-sm">Loading shipping zones…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-[#FF5F56]/30 bg-[#FF5F56]/5 p-6 text-center" role="alert">
        <AlertTriangle size={20} className="mx-auto mb-3 text-[#FF5F56]" aria-hidden="true" />
        <p className="text-sm text-white/80">{(error as Error)?.message || 'Could not load shipping zones.'}</p>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Shipping zones</h2>
          <p className="mt-1 text-sm text-white/50">
            Where you ship, and what each destination costs at checkout.
          </p>
        </div>
        {!showForm && (
          <Button variant="primary" size="sm" icon={<Plus size={14} aria-hidden="true" />} onClick={() => setShowForm(true)}>
            New zone
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="mb-5 text-sm font-semibold text-white">New shipping zone</h3>

          <div className="space-y-5">
            <Input
              label="Zone name"
              id="zone-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Domestic, West Africa, Europe…"
              required
            />

            <div>
              <label htmlFor="zone-country" className="mb-1.5 block text-sm font-medium text-white/70">
                Countries
              </label>
              <div className="flex gap-2">
                <input
                  id="zone-country"
                  value={countryInput}
                  onChange={e => setCountryInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCountry();
                    }
                  }}
                  placeholder="Two-letter code, e.g. NG"
                  maxLength={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm uppercase text-white placeholder:normal-case placeholder:text-white/30 focus:border-[#FFBD2E]/50 focus:outline-none"
                />
                <Button type="button" variant="secondary" size="md" onClick={addCountry}>Add</Button>
              </div>

              {countries.length > 0 && (
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {countries.map(code => (
                    <li key={code}>
                      <button
                        type="button"
                        onClick={() => setCountries(prev => prev.filter(c => c !== code))}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 transition-colors hover:border-[#FF5F56]/40 hover:text-[#FF5F56]"
                        aria-label={`Remove ${code}`}
                      >
                        {code}
                        <X size={11} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-white/70">Shipping methods</legend>
              <div className="space-y-3">
                {methods.map((method, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`m-name-${i}`} className="mb-1 block text-xs text-white/50">Name</label>
                        <input
                          id={`m-name-${i}`}
                          value={method.name}
                          onChange={e => setMethod(i, { name: e.target.value })}
                          placeholder="Standard delivery"
                          className="w-full rounded-lg border border-white/10 bg-[#121528] px-3 py-2 text-sm text-white focus:border-[#FFBD2E]/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor={`m-type-${i}`} className="mb-1 block text-xs text-white/50">Rate type</label>
                        <select
                          id={`m-type-${i}`}
                          value={method.rateType}
                          onChange={e => setMethod(i, { rateType: e.target.value as RateType })}
                          className="w-full rounded-lg border border-white/10 bg-[#121528] px-3 py-2 text-sm text-white focus:border-[#FFBD2E]/50 focus:outline-none"
                        >
                          {(Object.keys(RATE_LABELS) as RateType[]).map(t => (
                            <option key={t} value={t}>{RATE_LABELS[t]}</option>
                          ))}
                        </select>
                      </div>
                      {method.rateType !== 'FREE_SHIPPING' && (
                        <div>
                          <label htmlFor={`m-price-${i}`} className="mb-1 block text-xs text-white/50">Price</label>
                          <input
                            id={`m-price-${i}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={method.price}
                            onChange={e => setMethod(i, { price: e.target.value })}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-white/10 bg-[#121528] px-3 py-2 text-sm text-white focus:border-[#FFBD2E]/50 focus:outline-none"
                          />
                        </div>
                      )}
                      <div>
                        <label htmlFor={`m-days-${i}`} className="mb-1 block text-xs text-white/50">
                          Estimated delivery (optional)
                        </label>
                        <input
                          id={`m-days-${i}`}
                          value={method.estimatedDays}
                          onChange={e => setMethod(i, { estimatedDays: e.target.value })}
                          placeholder="3-5 business days"
                          className="w-full rounded-lg border border-white/10 bg-[#121528] px-3 py-2 text-sm text-white focus:border-[#FFBD2E]/50 focus:outline-none"
                        />
                      </div>
                    </div>

                    {methods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMethods(prev => prev.filter((_, idx) => idx !== i))}
                        className="mt-2 text-xs text-white/40 transition-colors hover:text-[#FF5F56]"
                      >
                        Remove this method
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setMethods(prev => [...prev, { ...BLANK_METHOD }])}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#FFBD2E] transition-opacity hover:opacity-80"
              >
                <Plus size={13} aria-hidden="true" /> Add another method
              </button>
            </fieldset>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" loading={createZone.isPending}>
              Create zone
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={reset}>Cancel</Button>
          </div>
        </form>
      )}

      {zones.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <Globe size={20} className="mx-auto mb-3 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/60">
            No shipping zones yet. Until you add one, checkout cannot quote a delivery rate.
          </p>
          <div className="mt-5">
            <Button variant="primary" size="md" icon={<Plus size={14} aria-hidden="true" />} onClick={() => setShowForm(true)}>
              Create your first zone
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {zones.map(zone => (
            <li key={zone.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white">{zone.name}</h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {zone.countries.map(code => (
                      <li key={code}>
                        <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white/60">
                          {code}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(zone.id, zone.name)}
                  aria-label={`Delete ${zone.name}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-[#FF5F56]/10 hover:text-[#FF5F56]"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>

              {zone.methods?.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-white/5 pt-4">
                  {zone.methods.map((method, i) => (
                    <li key={method.id || i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 text-white/80">
                        {method.name}
                        <Badge variant="default" size="sm">
                          {RATE_LABELS[method.rateType as RateType] ?? method.rateType}
                        </Badge>
                        {method.estimatedDays && (
                          <span className="text-xs text-white/40">{method.estimatedDays}</span>
                        )}
                      </span>
                      <span className="font-mono text-sm text-white">
                        {method.price === 0 ? 'Free' : `$${method.price.toFixed(2)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
