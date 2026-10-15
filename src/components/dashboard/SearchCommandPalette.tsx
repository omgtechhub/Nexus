import { useState, useEffect } from 'react';
import { Search, X, Package, ShoppingBag, Users, BarChart3, Settings, Boxes, CreditCard, Truck, Sparkles, Star, LifeBuoy, ArrowRight } from 'lucide-react';
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
    { id: 'overview', title: 'Dashboard Overview', category: 'Navigation', section: 'overview', icon: <BarChart3 className="w-4 h-4 text-[var(--brand-red-ink)]" /> },
    { id: 'analytics', title: 'Analytics & Sales Reports', category: 'Navigation', section: 'analytics', icon: <BarChart3 className="w-4 h-4 text-[var(--brand-yellow-ink)]" /> },
    { id: 'orders', title: 'Orders Directory', category: 'Navigation', section: 'orders', icon: <ShoppingBag className="w-4 h-4 text-[var(--brand-green-ink)]" /> },
    { id: 'products', title: 'Products & Inventory', category: 'Navigation', section: 'products', icon: <Package className="w-4 h-4 text-purple-400" /> },
    { id: 'customers', title: 'Customer Database', category: 'Navigation', section: 'customers', icon: <Users className="w-4 h-4 text-sky-400" /> },
    { id: 'nexus-iq', title: 'Nexus IQ', category: 'Navigation', section: 'nexus-iq', icon: <Sparkles className="w-4 h-4 text-[var(--brand-yellow-ink)]" /> },
    { id: 'payments', title: 'Payments & Payouts', category: 'Commerce', section: 'payments', icon: <CreditCard className="w-4 h-4 text-[var(--brand-green-ink)]" /> },
    { id: 'inventory', title: 'Inventory & Stock Levels', category: 'Commerce', section: 'inventory', icon: <Boxes className="w-4 h-4 text-pink-400" /> },
    { id: 'shipments', title: 'Shipments & Fulfilment', category: 'Commerce', section: 'shipments', icon: <Truck className="w-4 h-4 text-sky-400" /> },
    { id: 'reviews', title: 'Ratings & Reviews', category: 'Commerce', section: 'reviews', icon: <Star className="w-4 h-4 text-[var(--brand-yellow-ink)]" /> },
    { id: 'settings', title: 'Account Settings & API Keys', category: 'Account', section: 'settings', icon: <Settings className="w-4 h-4 text-gray-400" /> },
    { id: 'help', title: 'Help Centre', category: 'Account', section: 'help', icon: <LifeBuoy className="w-4 h-4 text-gray-400" /> },
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
      <div className="bg-[var(--surface-overlay)] border border-[var(--ink)]/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Search input bar */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--ink)]/10 gap-3">
          <Search size={18} className="text-muted flex-shrink-0" />
          <input aria-label="Type a command or search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-primary text-sm rounded placeholder-[var(--ink)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-xs text-muted hover:text-primary">
              Clear
            </button>
          )}
          <button aria-label="Close search"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-primary hover:bg-[var(--ink)]/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results list */}
        <div className="p-2 max-h-[60vh] overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              No matching pages or tools found for "{query}"
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.section)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--ink)]/5 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-primary group-hover:text-[var(--brand-yellow-ink)] transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted">{item.category}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted group-hover:text-primary group-hover:translate-x-1 transition" />
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-[var(--ink)]/5 bg-[var(--ink)]/[0.02] flex items-center justify-between text-xs text-muted">
          <span>Navigate with click or type to filter</span>
          <span className="bg-[var(--ink)]/10 px-1.5 py-0.5 rounded text-[10px]">ESC to close</span>
        </div>
      </div>
    </div>
  );
}
