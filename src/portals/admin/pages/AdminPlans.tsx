import { useState } from 'react';
import { Layers, Plus, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import {
  usePlatformPlansQuery,
  useCreatePlatformPlanMutation,
  useUpdatePlatformPlanMutation,
} from '../../../hooks/useBillingQueries';
import type { SubscriptionPlanData } from '../../../api/billing';
import { LoadingState, ErrorState, PageHeading } from '../../customer/components/States';
import { money } from '../format';

type PlanForm = {
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  maxProducts: number;
  maxTeamMembers: number;
  advancedAnalyticsAllowed: boolean;
};

const BLANK: PlanForm = {
  code: '', name: '', description: '',
  monthlyPrice: 49, annualPrice: 490, trialDays: 14,
  maxProducts: 200, maxTeamMembers: 5,
  advancedAnalyticsAllowed: true,
};

export function AdminPlans() {
  const { data: plans = [], isLoading, isError, error, refetch } = usePlatformPlansQuery();
  const createPlan = useCreatePlatformPlanMutation();
  const updatePlan = useUpdatePlatformPlanMutation();

  const [editing, setEditing] = useState<SubscriptionPlanData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PlanForm>(BLANK);

  const openCreate = () => {
    setEditing(null);
    setForm(BLANK);
    setShowForm(true);
  };

  const openEdit = (plan: SubscriptionPlanData) => {
    setEditing(plan);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      trialDays: plan.trialDays,
      maxProducts: plan.maxProducts,
      maxTeamMembers: plan.maxTeamMembers,
      advancedAnalyticsAllowed: plan.advancedAnalyticsAllowed,
    });
    setShowForm(true);
  };

  const close = () => {
    setShowForm(false);
    setEditing(null);
    setForm(BLANK);
  };

  const num = (key: keyof PlanForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: Number(e.target.value) }));
  const text = (key: keyof PlanForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updatePlan.mutateAsync({ id: editing.id, updates: form });
        toast.success(`Plan "${form.name}" updated`);
      } else {
        await createPlan.mutateAsync(form);
        toast.success(`Plan "${form.name}" created`);
      }
      close();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save that plan');
    }
  };

  if (isLoading) return <LoadingState label="Loading plans…" />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeading title="Subscription plans" subtitle="What merchants can buy, and the limits each tier carries." />
        {!showForm && (
          <Button variant="primary" size="sm" icon={<Plus size={14} aria-hidden="true" />} onClick={openCreate}>
            New plan
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5 sm:p-6">
          <h2 className="mb-5 text-sm font-semibold text-primary">
            {editing ? `Edit ${editing.name}` : 'New subscription plan'}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" id="plan-name" value={form.name} onChange={text('name')} required />
            <Input
              label="Code"
              id="plan-code"
              value={form.code}
              onChange={text('code')}
              disabled={Boolean(editing)}
              hint={editing ? 'The code identifies the plan and cannot change.' : 'Lowercase identifier, e.g. growth'}
              required
            />
            <div className="sm:col-span-2">
              <Input label="Description" id="plan-desc" value={form.description} onChange={text('description')} required />
            </div>
            <Input label="Monthly price" id="plan-monthly" type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={num('monthlyPrice')} required />
            <Input label="Annual price" id="plan-annual" type="number" min="0" step="0.01" value={form.annualPrice} onChange={num('annualPrice')} required />
            <Input label="Trial days" id="plan-trial" type="number" min="0" value={form.trialDays} onChange={num('trialDays')} />
            <Input label="Max products" id="plan-products" type="number" min="0" value={form.maxProducts} onChange={num('maxProducts')} />
            <Input label="Max team members" id="plan-team" type="number" min="0" value={form.maxTeamMembers} onChange={num('maxTeamMembers')} />
          </div>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium text-body">Capabilities</legend>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm text-body">
                <input
                  type="checkbox"
                  checked={form.advancedAnalyticsAllowed}
                  onChange={e => setForm(prev => ({ ...prev, advancedAnalyticsAllowed: e.target.checked }))}
                  className="h-4 w-4 rounded border-[var(--ink)]/20 bg-[var(--ink)]/5 accent-[#FFBD2E]"
                />
                Advanced analytics
              </label>
            </div>
          </fieldset>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" loading={createPlan.isPending || updatePlan.isPending}>
              {editing ? 'Save changes' : 'Create plan'}
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={close}>Cancel</Button>
          </div>
        </form>
      )}

      {plans.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] px-6 py-14 text-center">
          <Layers size={20} className="mx-auto mb-3 text-muted" aria-hidden="true" />
          <p className="text-sm text-secondary">
            No plans yet. Merchants cannot subscribe until at least one exists.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {plans.map(plan => (
            <li key={plan.id} className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-primary">{plan.name}</h3>
                    <Badge variant={plan.isActive ? 'success' : 'default'} size="sm">
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] uppercase text-[var(--brand-yellow-ink)]">{plan.code}</p>
                  <p className="mt-2 text-sm text-muted">{plan.description}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Edit3 size={13} aria-hidden="true" />}
                  onClick={() => openEdit(plan)}
                >
                  Edit
                </Button>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{money(plan.monthlyPrice)}</span>
                <span className="text-xs text-muted">per month</span>
                <span className="ml-auto text-xs text-muted">{money(plan.annualPrice)} annually</span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--ink)]/10 pt-4 text-xs">
                <Limit label="Products" value={plan.maxProducts} />
                <Limit label="Team" value={plan.maxTeamMembers} />
              </dl>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {plan.advancedAnalyticsAllowed && <Capability>Advanced analytics</Capability>}
                {plan.trialDays > 0 && <Capability>{plan.trialDays}-day trial</Capability>}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Limit({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-strong">{value}</dd>
    </div>
  );
}

function Capability({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-md bg-[var(--ink)]/5 px-2 py-0.5 text-[11px] text-secondary">{children}</li>
  );
}
