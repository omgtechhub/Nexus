import { useState } from 'react';
import {
  ShieldCheck, DollarSign, Users, Store, Layers, TrendingUp, Plus, Edit3, CheckCircle2, XCircle, FileText, ArrowUpRight
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  usePlatformMetricsQuery,
  usePlatformMerchantsQuery,
  usePlatformPlansQuery,
  useCreatePlatformPlanMutation,
  useUpdatePlatformPlanMutation,
  usePlatformInvoicesQuery,
} from '../../hooks/useBillingQueries';
import toast from 'react-hot-toast';

export function PlatformAdminView({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'merchants' | 'plans' | 'invoices'>('metrics');

  // Platform Admin Queries
  const { data: metrics, isLoading: metricsLoading } = usePlatformMetricsQuery();
  const { data: merchants = [], isLoading: merchantsLoading } = usePlatformMerchantsQuery();
  const { data: plans = [], isLoading: plansLoading } = usePlatformPlansQuery();
  const { data: invoices = [], isLoading: invoicesLoading } = usePlatformInvoicesQuery();

  const createPlanMutation = useCreatePlatformPlanMutation();
  const updatePlanMutation = useUpdatePlatformPlanMutation();

  // New Plan Modal State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  const [planForm, setPlanForm] = useState({
    code: '',
    name: '',
    description: '',
    monthlyPrice: 49,
    annualPrice: 490,
    maxProducts: 200,
    maxTeamMembers: 5,
    customDomainAllowed: true,
    advancedAnalyticsAllowed: true,
  });

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await updatePlanMutation.mutateAsync({ id: editingPlan.id, updates: planForm });
        toast.success(`Plan "${editingPlan.name}" updated!`);
      } else {
        await createPlatformPlanMutation.mutateAsync(planForm);
        toast.success('New SaaS plan created!');
      }
      setShowPlanModal(false);
      setEditingPlan(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save plan');
    }
  };

  return (
    <div className="min-h-screen bg-[#060813] text-white p-6 sm:p-10 font-sans space-y-8">
      {/* Platform Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 tracking-tight">
              <ShieldCheck size={28} className="text-[#FFBD2E]" /> Nexus SaaS Platform Administration
            </h1>
            <Badge variant="success" size="sm">SuperAdmin Active</Badge>
          </div>
          <p className="text-xs text-white/50 mt-1">Platform MRR/ARR analytics, merchant subscriptions, and global SaaS plan management.</p>
        </div>

        {onClose && (
          <Button variant="secondary" size="sm" onClick={onClose}>
            Exit Platform Admin
          </Button>
        )}
      </div>

      {/* Admin Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'metrics', label: 'Platform Metrics & MRR', icon: <TrendingUp size={14} /> },
          { id: 'merchants', label: 'Merchant Directory', icon: <Store size={14} /> },
          { id: 'plans', label: 'SaaS Subscription Plans', icon: <Layers size={14} /> },
          { id: 'invoices', label: 'Platform Invoices', icon: <FileText size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-[#FFBD2E] text-slate-950 shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* METRICS TAB */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="stat-card p-5 space-y-2">
              <span className="text-xs text-white/50 font-medium">Monthly Recurring Revenue (MRR)</span>
              <h3 className="text-3xl font-extrabold text-[#27C93F]">${metrics?.mrr.toFixed(2) || '0.00'}</h3>
              <p className="text-[11px] text-white/40 font-mono">Calculated from active merchant plans</p>
            </div>

            <div className="stat-card p-5 space-y-2">
              <span className="text-xs text-white/50 font-medium">Annual Recurring Revenue (ARR)</span>
              <h3 className="text-3xl font-extrabold text-[#FFBD2E]">${metrics?.arr.toFixed(2) || '0.00'}</h3>
              <p className="text-[11px] text-white/40 font-mono">Run-rate forecast for 12 months</p>
            </div>

            <div className="stat-card p-5 space-y-2">
              <span className="text-xs text-white/50 font-medium">Active Merchant Subscriptions</span>
              <h3 className="text-3xl font-extrabold text-white">{metrics?.activeSubscriptionsCount || 0}</h3>
              <p className="text-[11px] text-white/40 font-mono">Total stores on active billing</p>
            </div>

            <div className="stat-card p-5 space-y-2">
              <span className="text-xs text-white/50 font-medium">Total Platform Volume</span>
              <h3 className="text-3xl font-extrabold text-white">${metrics?.totalRevenue.toFixed(2) || '0.00'}</h3>
              <p className="text-[11px] text-white/40 font-mono">{metrics?.totalTransactionsCount || 0} paid transactions</p>
            </div>
          </div>
        </div>
      )}

      {/* MERCHANTS TAB */}
      {activeTab === 'merchants' && (
        <div className="stat-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Merchant Stores & Subscription Status</h3>
          <div className="space-y-3">
            {merchants.map((m) => (
              <div key={m.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{m.name}</span>
                    <span className="font-mono text-white/40">({m.domain})</span>
                    <Badge variant="success" size="sm">{m.status}</Badge>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    Owner: {m.owner?.name} ({m.owner?.email}) • Joined {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <span className="text-white/40 text-[10px] uppercase font-bold block">Current Plan</span>
                    <span className="font-bold text-[#FFBD2E]">{m.subscription?.planName || 'Free/Trial'}</span>
                  </div>
                  <div>
                    <span className="text-white/40 text-[10px] uppercase font-bold block">Products</span>
                    <span className="font-bold text-white">{m.metrics.productCount}</span>
                  </div>
                  <div>
                    <span className="text-white/40 text-[10px] uppercase font-bold block">Team</span>
                    <span className="font-bold text-white">{m.metrics.memberCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PLANS TAB */}
      {activeTab === 'plans' && (
        <div className="stat-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Configurable SaaS Plans & Capability Limits</h3>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => {
                setEditingPlan(null);
                setPlanForm({
                  code: '',
                  name: '',
                  description: '',
                  monthlyPrice: 49,
                  annualPrice: 490,
                  maxProducts: 200,
                  maxTeamMembers: 5,
                  customDomainAllowed: true,
                  advancedAnalyticsAllowed: true,
                });
                setShowPlanModal(true);
              }}
            >
              Create New Plan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-base">{p.name}</h4>
                    <span className="text-[10px] font-mono text-[#FFBD2E] uppercase">{p.code}</span>
                  </div>
                  <Badge variant={p.isActive ? 'success' : 'secondary'} size="sm">
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">${p.monthlyPrice}</span>
                  <span className="text-xs text-white/50">/month</span>
                </div>

                <div className="text-xs text-white/60 space-y-1 pt-2 border-t border-white/10">
                  <p>• Max Products: <strong>{p.maxProducts}</strong></p>
                  <p>• Max Team Members: <strong>{p.maxTeamMembers}</strong></p>
                  <p>• Custom Domains: <strong>{p.customDomainAllowed ? 'Yes' : 'No'}</strong></p>
                  <p>• Advanced Analytics: <strong>{p.advancedAnalyticsAllowed ? 'Yes' : 'No'}</strong></p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={<Edit3 size={13} />}
                  onClick={() => {
                    setEditingPlan(p);
                    setPlanForm({
                      code: p.code,
                      name: p.name,
                      description: p.description,
                      monthlyPrice: p.monthlyPrice,
                      annualPrice: p.annualPrice,
                      maxProducts: p.maxProducts,
                      maxTeamMembers: p.maxTeamMembers,
                      customDomainAllowed: p.customDomainAllowed,
                      advancedAnalyticsAllowed: p.advancedAnalyticsAllowed,
                    });
                    setShowPlanModal(true);
                  }}
                >
                  Edit Capability Limits
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div className="stat-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Platform Invoice Audit Log</h3>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white font-mono">{inv.invoiceNumber}</span>
                  <span className="text-white/40 ml-2">Store: {inv.storeId}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-[#27C93F]">${inv.total.toFixed(2)}</span>
                  <Badge variant="success" size="sm">{inv.status}</Badge>
                  <span className="text-white/40">{new Date(inv.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Edit / Create Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#121528] border border-white/20 p-6 rounded-2xl max-w-lg w-full space-y-4">
            <h3 className="text-lg font-bold text-white">{editingPlan ? `Edit Plan (${editingPlan.name})` : 'Create SaaS Subscription Plan'}</h3>
            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Plan Name"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Pro Merchant"
                />
                <Input
                  label="Plan Code"
                  value={planForm.code}
                  disabled={Boolean(editingPlan)}
                  onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                  placeholder="e.g. pro"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Monthly Price ($)"
                  type="number"
                  value={planForm.monthlyPrice}
                  onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: Number(e.target.value) })}
                />
                <Input
                  label="Annual Price ($)"
                  type="number"
                  value={planForm.annualPrice}
                  onChange={(e) => setPlanForm({ ...planForm, annualPrice: Number(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Max Products Limit"
                  type="number"
                  value={planForm.maxProducts}
                  onChange={(e) => setPlanForm({ ...planForm, maxProducts: Number(e.target.value) })}
                />
                <Input
                  label="Max Team Members"
                  type="number"
                  value={planForm.maxTeamMembers}
                  onChange={(e) => setPlanForm({ ...planForm, maxTeamMembers: Number(e.target.value) })}
                />
              </div>

              <div className="flex gap-2 pt-3">
                <Button type="submit" variant="primary" size="md" fullWidth loading={createPlanMutation.isPending || updatePlanMutation.isPending}>
                  Save Plan Config
                </Button>
                <Button variant="ghost" size="md" onClick={() => setShowPlanModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
