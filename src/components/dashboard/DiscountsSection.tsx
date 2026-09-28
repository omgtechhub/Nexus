import { useState } from 'react';
import { 
  Tag, Plus, Trash2, Copy, Sparkles, Loader2, AlertTriangle, RotateCw
} from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import { useDiscountsQuery, useCreateDiscountMutation, useDeleteDiscountMutation } from '../../hooks/useQueries';

export function DiscountsSection() {
  const { data: discounts = [], isLoading, error, isError, refetch } = useDiscountsQuery();
  const createDiscountMutation = useCreateDiscountMutation();
  const deleteDiscountMutation = useDeleteDiscountMutation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'shipping'>('percentage');
  const [discountValue, setDiscountValue] = useState('15');
  const [maxUsage, setMaxUsage] = useState('250');
  const [minOrder, setMinOrder] = useState('0');

  const handleCreateDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode) return;

    const formattedCode = newCode.toUpperCase().replace(/\s+/g, '');

    createDiscountMutation.mutate(
      {
        code: formattedCode,
        type: discountType.toUpperCase() as any,
        value: discountValue,
        maxRedemptions: Number(maxUsage) || 100,
        minOrderAmount: Number(minOrder) || 0,
      },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setNewCode('');
          toast.success(`Discount code "${formattedCode}" created & active!`, { icon: '🏷️' });
        },
        onError: (err: any) => {
          toast.error(err.message || 'Failed to create discount code');
        },
      }
    );
  };

  const handleDeleteDiscount = (id: string, code: string) => {
    deleteDiscountMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`Discount "${code}" deleted.`);
      },
      onError: (err: any) => {
        toast.error(err.message || 'Failed to delete discount');
      },
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code "${code}" copied to clipboard!`);
  };

  const totalRedemptions = discounts.reduce((sum, d) => sum + (d.redemptions || 0), 0);
  const topDiscount = [...discounts].sort((a, b) => (b.redemptions || 0) - (a.redemptions || 0))[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="text-[#FFBD2E]" size={22} /> Discounts & Promo Codes
          </h2>
          <p className="text-xs text-white/50">Create promotional codes, automatic checkout discounts, and customer loyalty rewards.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} icon={<Plus size={15} />}>
          Create New Discount
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card p-5 space-y-1">
          <span className="text-xs text-white/40 block">Active Promo Codes</span>
          <span className="text-2xl font-extrabold text-white block">
            {discounts.filter(d => (d.status as string).toLowerCase() === 'active').length} Active
          </span>
          <span className="text-[11px] text-[#27C93F] font-semibold">Live PostgreSQL database backed</span>
        </div>

        <div className="stat-card p-5 space-y-1">
          <span className="text-xs text-white/40 block">Total Redemptions</span>
          <span className="text-2xl font-extrabold text-[#FFBD2E] block">{totalRedemptions} Uses</span>
          <span className="text-[11px] text-white/50">Across all store campaigns</span>
        </div>

        <div className="stat-card p-5 space-y-1">
          <span className="text-xs text-white/40 block">Top Performing Code</span>
          <span className="text-sm font-bold text-white block flex items-center gap-1.5 pt-1">
            <Sparkles size={16} className="text-[#FF5F56]" /> {topDiscount ? `${topDiscount.code} (${topDiscount.redemptions} uses)` : 'None'}
          </span>
          <span className="text-[11px] text-white/40">{topDiscount ? topDiscount.value : 'Create code to get started'}</span>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="stat-card overflow-hidden space-y-4 p-5">
        <h3 className="text-sm font-bold text-white">Promo Code Directory</h3>

        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-white/40">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading discount codes...
          </div>
        ) : isError || error ? (
          <div className="p-6 border border-[#FF5F56]/30 bg-[#FF5F56]/5 text-center space-y-3 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-[#FF5F56]/10 border border-[#FF5F56]/20 flex items-center justify-center mx-auto text-[#FF5F56]">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Couldn't load discounts</h4>
              <p className="text-xs text-[#FF5F56] mt-1">{(error as Error)?.message || 'Failed to load discounts'}</p>
            </div>
            <Button variant="ghost" size="sm" icon={<RotateCw size={13} />} onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/80">
              <thead className="bg-white/5 text-white/40 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Discount Code</th>
                  <th className="py-3 px-4">Discount Value</th>
                  <th className="py-3 px-4">Redemptions / Limit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {discounts.map(d => (
                  <tr key={d.id} className="hover:bg-white/5">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#FFBD2E]">
                      <div className="flex items-center gap-2">
                        <span>{d.code}</span>
                        <button onClick={() => copyCode(d.code)} className="text-white/30 hover:text-white">
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {(d.type as string).toLowerCase() === 'percentage'
                        ? `${d.value}% OFF`
                        : (d.type as string).toLowerCase() === 'fixed'
                        ? `$${d.value} OFF`
                        : 'Free Shipping'}
                    </td>
                    <td className="py-3.5 px-4 text-white/70">
                      {d.redemptions} / {d.maxRedemptions}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (d.status as string).toLowerCase() === 'active' ? 'bg-[#27C93F]/10 text-[#27C93F]' : 'bg-[#FF5F56]/10 text-[#FF5F56]'
                      }`}>
                        {d.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-white/40">{d.createdAt}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={() => handleDeleteDiscount(d.id, d.code)}
                        disabled={deleteDiscountMutation.isPending}
                        className="p-1.5 rounded text-white/30 hover:text-[#FF5F56] hover:bg-[#FF5F56]/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Discount Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-md glass p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Tag className="text-[#FFBD2E]" size={20} /> Create New Discount Code
            </h3>

            <form onSubmit={handleCreateDiscount} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/60 mb-1">Promo Code Name</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. FLASH25"
                  className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono uppercase focus:outline-none focus:border-[#FFBD2E]"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#15182b] border border-white/10 text-white focus:outline-none focus:border-[#FFBD2E]"
                >
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="fixed">Fixed Amount Discount ($)</option>
                  <option value="shipping">Free Shipping</option>
                </select>
              </div>

              {discountType !== 'shipping' && (
                <div>
                  <label className="block text-white/60 mb-1">
                    {discountType === 'percentage' ? 'Percentage Off (%)' : 'Dollar Amount Off ($)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-white/60 mb-1">Min Order Subtotal ($)</label>
                <input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">Maximum Usage Limit</label>
                <input
                  type="number"
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="primary" size="sm" type="submit" disabled={createDiscountMutation.isPending}>
                  {createDiscountMutation.isPending ? 'Saving...' : 'Save & Activate Code'}
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddModal(false)}>
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
