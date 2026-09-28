import { useState, useEffect } from 'react';
import { Search, X, Package, ShoppingBag, Users, BarChart3, Settings, Store, CreditCard, Tag, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  title: string;
  category: string;
  section: string;
  icon: React.ReactNode;
}

export function SearchCommandPalette({ isOpen, onClose }: SearchCommandPaletteProps) {
  const { navigate } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const items: SearchItem[] = [
    { id: 'overview', title: 'Dashboard Overview', category: 'Navigation', section: 'overview', icon: <BarChart3 className="w-4 h-4 text-[#FF5F56]" /> },
    { id: 'analytics', title: 'Analytics & Sales Reports', category: 'Navigation', section: 'analytics', icon: <BarChart3 className="w-4 h-4 text-[#FFBD2E]" /> },
    { id: 'orders', title: 'Orders Directory', category: 'Navigation', section: 'orders', icon: <ShoppingBag className="w-4 h-4 text-[#27C93F]" /> },
    { id: 'products', title: 'Products & Inventory', category: 'Navigation', section: 'products', icon: <Package className="w-4 h-4 text-purple-400" /> },
    { id: 'customers', title: 'Customer Database', category: 'Navigation', section: 'customers', icon: <Users className="w-4 h-4 text-sky-400" /> },
    { id: 'storefront', title: 'Storefront Theme & Branding', category: 'Commerce', section: 'storefront', icon: <Store className="w-4 h-4 text-[#FFBD2E]" /> },
    { id: 'payments', title: 'Payments & Gateways', category: 'Commerce', section: 'payments', icon: <CreditCard className="w-4 h-4 text-[#27C93F]" /> },
    { id: 'discounts', title: 'Discounts & Coupon Codes', category: 'Commerce', section: 'discounts', icon: <Tag className="w-4 h-4 text-pink-400" /> },
    { id: 'settings', title: 'Account Settings & API Keys', category: 'Account', section: 'settings', icon: <Settings className="w-4 h-4 text-gray-400" /> },
  ];

  const filtered = items.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (section: string) => {
    navigate('dashboard', section);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121528] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Search input bar */}
        <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3">
          <Search size={18} className="text-white/40 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-white/40"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-xs text-white/40 hover:text-white">
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results list */}
        <div className="p-2 max-h-[60vh] overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/40">
              No matching pages or tools found for "{query}"
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.section)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white group-hover:text-[#FFBD2E] transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-white/30">{item.category}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-white/30">
          <span>Navigate with click or type to filter</span>
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">ESC to close</span>
        </div>
      </div>
    </div>
  );
}
