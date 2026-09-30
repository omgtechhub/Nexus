import { Package, UserPlus, Tag, ShoppingBag, Store, X } from 'lucide-react';
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
      icon: <Package className="w-5 h-5 text-[#FF5F56]" />,
      title: 'Add New Product',
      description: 'Upload images, set inventory, prices & variants',
      section: 'products',
    },
    {
      icon: <ShoppingBag className="w-5 h-5 text-[#FFBD2E]" />,
      title: 'Create Manual Order',
      description: 'Draft custom order for phone or custom sales',
      section: 'orders',
    },
    {
      icon: <UserPlus className="w-5 h-5 text-[#27C93F]" />,
      title: 'Add Customer',
      description: 'Add a new client profile with contact & shipping info',
      section: 'customers',
    },
    {
      icon: <Tag className="w-5 h-5 text-purple-400" />,
      title: 'Create Promo Code',
      description: 'Setup percentage, fixed, or free shipping discounts',
      section: 'discounts',
    },
    {
      icon: <Store className="w-5 h-5 text-sky-400" />,
      title: 'Customize Storefront',
      description: 'Launch store theme editor & change branding colors',
      section: 'storefront',
    },
  ];

  const handleSelect = (section: string) => {
    navigate('dashboard', section);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121528] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white">Quick Action</h3>
            <p className="text-xs text-muted">Select what you would like to create or add</p>
          </div>
          <button aria-label="Close"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(action.section)}
              className="w-full flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white group-hover:text-[#FFBD2E] transition-colors">
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
