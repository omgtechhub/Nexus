import { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Package, AlertTriangle, UploadCloud, RotateCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useUploadImageMutation, useProductsQuery } from '../../hooks/useQueries';
import { useMarketplaceCategoriesQuery } from '../../hooks/useMarketplace';
import { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import { formatCurrency } from '../../utils/money';

const statusVariant = {
  active: 'success' as const,
  draft: 'default' as const,
  archived: 'ghost' as const,
};

export function Products() {
  const { products, addProduct, updateProduct, deleteProduct: removeProduct, addActivity } = useApp();
  const { isError, error, refetch } = useProductsQuery();

  /*
   * Suggestions for the category box: every category live on the marketplace,
   * plus the ones this merchant already uses (a draft-only category is not in
   * the public grouping yet, and a seller should still be offered their own).
   */
  const { data: marketplaceCategories } = useMarketplaceCategoriesQuery();
  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    (marketplaceCategories?.categories ?? []).forEach(c => c.name && names.add(c.name));
    products.forEach(p => p.category && names.add(p.category));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [marketplaceCategories, products]);
  const uploadImageMut = useUploadImageMutation();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New product state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [inventory, setInventory] = useState('');
  const [category, setCategory] = useState('Apparel');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Edit product state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editInventory, setEditInventory] = useState('');
  const [editCategory, setEditCategory] = useState('Apparel');
  const [editStatus, setEditStatus] = useState<'active' | 'draft' | 'archived'>('active');

  // Submission loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  useDismissOnEscape(showAddModal, () => setShowAddModal(false));
  useDismissOnEscape(Boolean(editingProduct), () => setEditingProduct(null));

  const filtered = products.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadImageMut.mutateAsync(file);
      if (res && res.url) {
        setImageUrl(res.url);
        toast.success('Image uploaded successfully!', { icon: '🖼️' });
        setIsUploading(false);
        return;
      }
    } catch (err: any) {
      console.warn('API image upload unavailable, reading file locally:', err);
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
          toast.success('Image uploaded successfully!', { icon: '🖼️' });
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Image upload failed');
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = (id: string, productTitle: string) => {
    removeProduct(id, {
      onSuccess: () => {
        addActivity(`Product "${productTitle}" deleted from merchant catalog`, 'product', '🗑️');
        toast.success(`Product "${productTitle}" deleted successfully.`);
      },
      onError: (err: any) => {
        toast.error(err.message || 'Failed to delete product');
      },
    });
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) {
      toast.error('Please enter a product title and price');
      return;
    }

    setIsSubmitting(true);
    addProduct(
      {
        title,
        description: description || 'High-quality merchant product.',
        price: parseFloat(price) || 0,
        inventory: parseInt(inventory, 10) || 10,
        category,
        status: 'active',
        images: imageUrl ? [{ url: imageUrl, isPrimary: true, position: 0 }] as any : [],
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          setShowAddModal(false);
          setTitle('');
          setDescription('');
          setPrice('');
          setInventory('');
          setImageUrl('');
          toast.success(`Product "${title}" added to catalog!`, { icon: '🛍️' });
        },
        onError: (err: any) => {
          setIsSubmitting(false);
          toast.error(err.message || 'Failed to add product');
        },
      }
    );
  };

  const startEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditTitle(p.title);
    setEditDescription(p.description);
    setEditPrice(p.price.toString());
    setEditInventory(p.inventory.toString());
    setEditCategory(p.category);
    setEditStatus(p.status);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsEditingSubmitting(true);
    updateProduct(
      editingProduct.id,
      {
        title: editTitle,
        description: editDescription,
        price: parseFloat(editPrice) || editingProduct.price,
        inventory: parseInt(editInventory, 10) || 0,
        category: editCategory,
        status: editStatus,
      },
      {
        onSuccess: () => {
          setIsEditingSubmitting(false);
          addActivity(`Product "${editTitle}" updated details & pricing`, 'product', '✏️');
          setEditingProduct(null);
          toast.success(`Product "${editTitle}" updated!`, { icon: '✏️' });
        },
        onError: (err: any) => {
          setIsEditingSubmitting(false);
          toast.error(err.message || 'Failed to update product');
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      {/* One datalist for both forms: the create modal and the edit modal
          offer the same suggestions, and it exists whether either is open. */}
      <datalist id="nexus-category-options">
        {categoryOptions.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-muted text-sm">{products.length} products in catalog</p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowAddModal(true)}>
          Add product
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input aria-label="Search products"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="form-input pl-9 h-9 text-sm"
        />
      </div>

      {/* Products grid */}
      {isError ? (
        <div className="stat-card p-6 border border-[#FF5F56]/30 bg-[#FF5F56]/5 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#FF5F56]/10 border border-[#FF5F56]/20 flex items-center justify-center mx-auto text-[var(--brand-red-ink)]">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-primary">Couldn't load products</h4>
            <p className="text-xs text-[var(--brand-red-ink)] mt-1">{(error as Error)?.message || 'An error occurred while fetching products.'}</p>
          </div>
          <Button variant="ghost" size="sm" icon={<RotateCw size={13} />} onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => {
          const rawImage = product.images?.[0];
          const mainImage = typeof rawImage === 'string' ? rawImage : (rawImage as any)?.url || null;
          return (
            <div key={product.id} className="stat-card p-4 group">
              {/* Product image */}
              <div className="w-full h-44 rounded-xl bg-gradient-to-br from-[var(--ink)]/5 to-[var(--ink)]/10 border border-[var(--ink)]/10 flex items-center justify-center mb-4 relative overflow-hidden">
                {mainImage ? (
                  <img loading="lazy" decoding="async" src={mainImage} alt={product.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                ) : (
                  <Package size={40} className="text-decorative" />
                )}

                {product.inventory <= 3 && product.inventory > 0 && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#FFBD2E]/20 border border-[#FFBD2E]/30 text-[var(--brand-yellow-ink)] text-xs px-2 py-0.5 rounded-full font-medium">
                    <AlertTriangle size={10} />
                    Low stock
                  </div>
                )}
                {product.inventory === 0 && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#FF5F56]/20 border border-[#FF5F56]/30 text-[var(--brand-red-ink)] text-xs px-2 py-0.5 rounded-full font-medium">
                    Out of stock
                  </div>
                )}

                {/* Action buttons on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => startEditProduct(product)}
                    className="p-2 bg-[var(--ink)]/10 hover:bg-[var(--ink)]/20 rounded-lg text-primary transition-colors cursor-pointer"
                    title="Edit product"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button aria-label="Delete"
                    onClick={() => handleDeleteProduct(product.id, product.title)}
                    className="p-2 bg-[#FF5F56]/20 hover:bg-[#FF5F56]/30 rounded-lg text-[var(--brand-red-ink)] transition-colors cursor-pointer"
                    title="Delete product"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-primary leading-tight">{product.title}</h3>
                <Badge variant={statusVariant[product.status]} size="sm">
                  {product.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-base font-bold text-primary">{formatCurrency(product.price)}</span>
                {product.comparePrice && (
                  <span className="text-xs text-muted line-through">{formatCurrency(product.comparePrice)}</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted">
                <span className="bg-[var(--ink)]/5 px-2 py-0.5 rounded-full">{product.category}</span>
                <span className={cn(
                  product.inventory === 0 ? 'text-[var(--brand-red-ink)]' :
                  product.inventory <= 3 ? 'text-[var(--brand-yellow-ink)]' : 'text-muted'
                )}>
                  {product.inventory} in stock
                </span>
              </div>
            </div>
          );
        })}

        {/* Add product card */}
        <button
          onClick={() => setShowAddModal(true)}
          className="h-full min-h-[200px] rounded-2xl border-2 border-dashed border-[var(--ink)]/10 hover:border-[#FFBD2E]/50 flex flex-col items-center justify-center gap-3 text-muted hover:text-[var(--brand-yellow-ink)] transition-colors cursor-pointer"
        >
          <Plus size={24} />
          <span className="text-sm font-medium">Add new product</span>
        </button>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)} aria-hidden="true" />
          <div className="relative bg-[var(--surface-overlay)] border border-[var(--ink)]/20 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--ink)]/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Add New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-[var(--ink)]/10 transition-colors">✕</button>
            </div>
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1.5">Product Image</label>
                <div className="flex items-center gap-3">
                  {imageUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--ink)]/20 relative">
                      <img loading="lazy" decoding="async" src={imageUrl} alt="Uploaded preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-0 right-0 bg-black/70 text-primary text-xs p-0.5 rounded-bl"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex-1 flex flex-col items-center justify-center h-20 border-2 border-dashed border-[var(--ink)]/10 rounded-xl hover:border-[#FFBD2E]/50 cursor-pointer transition-colors">
                      <UploadCloud size={20} className="text-muted mb-1" />
                      <span className="text-xs text-muted">{isUploading ? 'Uploading…' : 'Upload product image'}</span>
                      <input type="file" aria-label="Upload product image" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-body mb-1.5">Product Title</label>
                <input aria-label="e.g. Premium Denim Jacket"
                  required
                  className="form-input bg-[var(--surface-overlay)] text-primary"
                  placeholder="e.g. Premium Denim Jacket"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="products-description-3" className="block text-sm font-medium text-body mb-1.5">Description</label>
                <textarea id="products-description-3"
                  className="form-input bg-[var(--surface-overlay)] text-primary resize-none"
                  rows={3}
                  placeholder="Describe your product…"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-body mb-1.5">Price ($)</label>
                  <input aria-label="120.00"
                    required
                    type="number"
                    step="0.01"
                    className="form-input bg-[var(--surface-overlay)] text-primary"
                    placeholder="120.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-body mb-1.5">Initial Stock</label>
                  <input aria-label="25"
                    type="number"
                    className="form-input bg-[var(--surface-overlay)] text-primary"
                    placeholder="25"
                    value={inventory}
                    onChange={e => setInventory(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="products-category-4" className="block text-sm font-medium text-body mb-1.5">Category</label>
                {/*
                  Type anything, or pick one that already exists.

                  This was a <select> of six hardcoded options, so a seller
                  could not list anything the list did not already name -- and
                  the shop's own "Shop by category" row is built by grouping
                  live products, so a category that cannot be entered can never
                  appear there. A datalist suggests what other sellers already
                  use (which keeps the grouping tidy) without preventing a new
                  one.
                */}
                <input
                  id="products-category-4"
                  list="nexus-category-options"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. Apparel, or a new one"
                  autoComplete="off"
                  className="form-input bg-[var(--surface-overlay)] text-primary"
                />
                <p className="mt-1 text-xs text-muted">
                  A new category appears in the shop as soon as the product is live.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" size="md" fullWidth disabled={isSubmitting}>
                  {isSubmitting ? 'Saving product…' : 'Save product'}
                </Button>
                <Button type="button" variant="ghost" size="md" onClick={() => setShowAddModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingProduct(null)} aria-hidden="true" />
          <div className="relative bg-[var(--surface-overlay)] border border-[var(--ink)]/20 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-[var(--ink)]/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Edit Product</h2>
              <button onClick={() => setEditingProduct(null)} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-[var(--ink)]/10 transition-colors">✕</button>
            </div>
            <form onSubmit={handleSaveEditProduct} className="p-6 space-y-4">
              <div>
                <label htmlFor="products-product-title-5" className="block text-sm font-medium text-body mb-1.5">Product Title</label>
                <input id="products-product-title-5"
                  required
                  className="form-input bg-[var(--surface-overlay)] text-primary"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="products-description-6" className="block text-sm font-medium text-body mb-1.5">Description</label>
                <textarea id="products-description-6"
                  className="form-input bg-[var(--surface-overlay)] text-primary resize-none"
                  rows={3}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="products-price-7" className="block text-sm font-medium text-body mb-1.5">Price ($)</label>
                  <input id="products-price-7"
                    required
                    type="number"
                    step="0.01"
                    className="form-input bg-[var(--surface-overlay)] text-primary"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="products-inventory-8" className="block text-sm font-medium text-body mb-1.5">Inventory</label>
                  <input id="products-inventory-8"
                    type="number"
                    className="form-input bg-[var(--surface-overlay)] text-primary"
                    value={editInventory}
                    onChange={e => setEditInventory(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="products-category-9" className="block text-sm font-medium text-body mb-1.5">Category</label>
                  <input
                    id="products-category-9"
                    list="nexus-category-options"
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    placeholder="e.g. Apparel, or a new one"
                    autoComplete="off"
                    className="form-input bg-[var(--surface-overlay)] text-primary"
                  />
                </div>
                <div>
                  <label htmlFor="products-status-10" className="block text-sm font-medium text-body mb-1.5">Status</label>
                  <select id="products-status-10"
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="form-input bg-[var(--surface-overlay)] text-primary"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" size="md" fullWidth disabled={isEditingSubmitting}>
                  {isEditingSubmitting ? 'Saving changes…' : 'Save changes'}
                </Button>
                <Button type="button" variant="ghost" size="md" onClick={() => setEditingProduct(null)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
