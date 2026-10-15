import { Package, UserPlus, Boxes, ShoppingBag, Sparkles, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const { navigate } = useApp();

  if (!isOpen) return null;

  const actions = [
    {
      icon: <Package className="w-5 h-5 text-[var(--brand-red-ink)]" />,
      title: 'Add New Product',
      description: 'Upload images, set inventory, prices & variants',
      section: 'products',
    },
    {
      icon: <ShoppingBag className="w-5 h-5 text-[var(--brand-yellow-ink)]" />,
      title: 'Create Manual Order',
      description: 'Draft custom order for phone or custom sales',
      section: 'orders',
    },
    {
      icon: <UserPlus className="w-5 h-5 text-[var(--brand-green-ink)]" />,
      title: 'Add Customer',
      description: 'Add a new client profile with contact & shipping info',
      section: 'customers',
    },
    {
      icon: <Boxes className="w-5 h-5 text-purple-400" />,
      title: 'Restock Inventory',
      description: 'Adjust stock levels and review low-stock warnings',
      section: 'inventory',
    },
    {
      icon: <Sparkles className="w-5 h-5 text-sky-400" />,
      title: 'Ask Nexus IQ',
      description: 'Get AI insight on demand, pricing and what to list next',
      section: 'nexus-iq',
    },
  ];

  const handleSelect = (section: string) => {
    navigate('dashboard', section);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[var(--surface-overlay)] border border-[var(--ink)]/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ink)]/10">
          <div>
            <h3 className="text-base font-bold text-primary">Quick Action</h3>
            <p className="text-xs text-muted">Select what you would like to create or add</p>
          </div>
          <button aria-label="Close"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-primary hover:bg-[var(--ink)]/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(action.section)}
              className="w-full flex items-center gap-4 p-3.5 rounded-xl bg-[var(--ink)]/[0.02] hover:bg-[var(--ink)]/[0.07] border border-[var(--ink)]/5 hover:border-[var(--ink)]/15 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-primary group-hover:text-[var(--brand-yellow-ink)] transition-colors">
                  {action.title}
                </h4>
                <p className="text-xs text-muted truncate">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
