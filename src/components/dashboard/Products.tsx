import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';
import { mockProducts } from '../../data/mockData';
import { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

const statusVariant = {
  active: 'success' as const,
  draft: 'default' as const,
  archived: 'ghost' as const,
};

export function Products() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = products.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-white/40 text-sm">{products.length} products in catalog</p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowAddModal(true)}>
          Add product
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="form-input pl-9 h-9 text-sm"
        />
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(product => (
          <div key={product.id} className="stat-card p-4 group">
            {/* Product image placeholder */}
            <div className="w-full h-40 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center mb-4 relative overflow-hidden">
              <Package size={40} className="text-white/10" />
              {product.inventory <= 3 && product.inventory > 0 && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#FFBD2E]/20 border border-[#FFBD2E]/30 text-[#FFBD2E] text-xs px-2 py-0.5 rounded-full font-medium">
                  <AlertTriangle size={10} />
                  Low stock
                </div>
              )}
              {product.inventory === 0 && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#FF5F56]/20 border border-[#FF5F56]/30 text-[#FF5F56] text-xs px-2 py-0.5 rounded-full font-medium">
                  Out of stock
                </div>
              )}
              {/* Action buttons on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="p-2 bg-[#FF5F56]/20 hover:bg-[#FF5F56]/30 rounded-lg text-[#FF5F56] transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-white leading-tight">{product.title}</h3>
              <Badge variant={statusVariant[product.status]} size="sm">
                {product.status}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold text-white">{formatCurrency(product.price)}</span>
              {product.comparePrice && (
                <span className="text-xs text-white/30 line-through">{formatCurrency(product.comparePrice)}</span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-white/40">
              <span className="bg-white/5 px-2 py-0.5 rounded-full">{product.category}</span>
              <span className={cn(
                product.inventory === 0 ? 'text-[#FF5F56]' :
                product.inventory <= 3 ? 'text-[#FFBD2E]' : 'text-white/40'
              )}>
                {product.inventory} in stock
              </span>
            </div>
          </div>
        ))}

        {/* Add product card */}
        <button
          onClick={() => setShowAddModal(true)}
          className="h-full min-h-[200px] rounded-2xl border-2 border-dashed border-white/10 hover:border-[#FFBD2E]/50 flex flex-col items-center justify-center gap-3 text-white/30 hover:text-[#FFBD2E] transition-all"
        >
          <Plus size={24} />
          <span className="text-sm font-medium">Add new product</span>
        </button>
      </div>

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative glass border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Product Title</label>
                <input className="form-input" placeholder="e.g. Premium Cotton T-Shirt" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Description</label>
                <textarea className="form-input resize-none" rows={3} placeholder="Describe your product..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Price ($)</label>
                  <input className="form-input" type="number" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Inventory</label>
                  <input className="form-input" type="number" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Category</label>
                <select className="form-input">
                  <option>Tops</option>
                  <option>Bottoms</option>
                  <option>Dresses</option>
                  <option>Shoes</option>
                  <option>Bags</option>
                  <option>Accessories</option>
                  <option>Outerwear</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="primary" size="md" fullWidth onClick={() => setShowAddModal(false)}>
                  Save product
                </Button>
                <Button variant="ghost" size="md" onClick={() => setShowAddModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
