import { useState } from 'react';
import {
  ShoppingBag, Search, X, Plus, Minus, Trash2, CheckCircle2, ArrowRight,
  Globe, ShieldCheck, Clock
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { CartProvider, useCart } from '../../context/CartContext';
import {
  useStorefrontInfoQuery,
  useStorefrontProductsQuery,
  useStorefrontCategoriesQuery,
  useCheckoutMutation,
} from '../../hooks/useStorefront';
import { StorefrontProduct, StorefrontProductVariant, CheckoutResult } from '../../api/storefront';
import { initializePaymentApi } from '../../api/payments';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { getAssetUrl } from '../../utils/assetPath';
import toast from 'react-hot-toast';

interface StorefrontViewProps {
  /** Omit to read the slug from the `/storefront/:storeSlug` route parameter. */
  storeSlug?: string;
  onClose?: () => void;
}

interface StorefrontContentProps {
  storeSlug: string;
  onClose?: () => void;
}

function StorefrontContent({ storeSlug, onClose }: StorefrontContentProps) {
  const { items, itemCount, subtotal, cartOpen, setCartOpen, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('newest');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<StorefrontProductVariant | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<CheckoutResult['order'] | null>(null);

  // Checkout Form State
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  // TODO(checkout): no phone field on the form yet.
  const customerPhone = '';
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [address1, setAddress1] = useState<string>('');
  // TODO(checkout): no apartment/suite field on the form yet.
  const address2 = '';
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [zip, setZip] = useState<string>('');
  // TODO(checkout): no country selector yet, so every order ships domestic.
  const country = 'United States';
  const [discountCode, setDiscountCode] = useState<string>('');

  // Queries
  const infoQuery = useStorefrontInfoQuery(storeSlug);
  const productsQuery = useStorefrontProductsQuery(storeSlug, {
    category: selectedCategory,
    q: searchQuery,
    sort: sortOption,
  });
  const categoriesQuery = useStorefrontCategoriesQuery(storeSlug);

  // Mutations. The cart is not stock-validated before checkout yet, so the
  // checkout call is where an out-of-stock line is first rejected — see Phase 4.
  const checkoutMut = useCheckoutMutation(storeSlug);

  const storeInfo = infoQuery.data?.store;
  const settings = storeInfo?.settings;
  const products = productsQuery.data?.products || [];
  const categories = categoriesQuery.data?.categories || [];
  // TODO(theming): settings.primaryColor is not applied to the storefront yet, so
  // every store renders in the default palette — see Phase 8 (design system).

  // Handle open product modal
  const handleOpenProduct = (prod: StorefrontProduct) => {
    setSelectedProduct(prod);
    setSelectedVariant(prod.variants && prod.variants.length > 0 ? prod.variants[0] : null);
    setModalQuantity(1);
  };

  // Add to cart from modal
  const handleAddToCartModal = () => {
    if (!selectedProduct) return;
    const targetVariantId = selectedVariant ? selectedVariant.id : selectedProduct.id;
    const variantTitle = selectedVariant ? selectedVariant.title : undefined;
    const itemPrice = selectedVariant ? selectedVariant.price : selectedProduct.price;
    const stockAvailable = selectedVariant ? selectedVariant.inventoryQuantity : selectedProduct.availableStock;

    addToCart({
      variantId: targetVariantId,
      productId: selectedProduct.id,
      title: selectedProduct.title,
      variantTitle,
      price: itemPrice,
      sku: selectedProduct.sku,
      image: selectedProduct.primaryImage || selectedProduct.images[0] || '',
      quantity: modalQuantity,
      maxStock: stockAvailable,
    });

    toast.success(`Added ${selectedProduct.title} to your bag!`, { icon: '🛍️' });
    setSelectedProduct(null);
  };

  // TODO(checkout): no gateway picker yet.
  const selectedProvider: 'PAYSTACK' | 'FLUTTERWAVE' = 'PAYSTACK';
  const [isInitializingPayment, setIsInitializingPayment] = useState<boolean>(false);

  // Handle Checkout submission
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      setIsInitializingPayment(true);
      const res = await checkoutMut.mutateAsync({
        items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
        customer: {
          email: customerEmail,
          name: customerName,
          phone: customerPhone || undefined,
        },
        shippingAddress: {
          firstName,
          lastName,
          address1,
          address2: address2 || undefined,
          city,
          state,
          zip,
          country,
        },
        discountCode: discountCode || undefined,
      });

      if (res.success && res.order) {
        clearCart();
        setCheckoutModalOpen(false);

        // The order exists but is unpaid until the gateway says otherwise, so the
        // customer is handed off to it rather than being shown a confirmation here.
        try {
          const initRes = await initializePaymentApi({
            orderId: res.order.id,
            provider: selectedProvider,
            callbackUrl: window.location.href,
          });

          if (initRes.success && initRes.data?.authorizationUrl) {
            // Kept for the return leg, which verifies the reference server-side.
            // TODO(checkout): no return-leg verification yet -- see Phase 4.
            try {
              sessionStorage.setItem('nexus_payment_reference', initRes.data.reference);
            } catch {
              // A blocked storage API must not stop the customer paying.
            }
            window.location.href = initRes.data.authorizationUrl;
            return;
          }

          toast.error('Could not reach the payment provider. Your order is saved as unpaid.');
        } catch (payErr: any) {
          console.error('Payment initialization error:', payErr);
          toast.error('Could not start payment. Your order is saved as unpaid.');
        } finally {
          setIsInitializingPayment(false);
        }

        // Payment never started, so show the order with its real, unpaid status.
        setCompletedOrder(res.order);
      }
    } catch (err: any) {
      setIsInitializingPayment(false);
      toast.error(err.message || 'Checkout failed. Please verify your items.');
    }
  };

  const orderIsPaid = completedOrder?.paymentStatus === 'PAID'
    || completedOrder?.paymentStatus === 'SUCCESS';

  const taxEstimate = Number((subtotal * 0.08).toFixed(2));
  const shippingEstimate = subtotal >= 100 || subtotal === 0 ? 0 : 15.0;
  const totalEstimate = Number((subtotal + taxEstimate + shippingEstimate).toFixed(2));

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-primary flex flex-col font-sans">
      {/* Top Announcement Bar */}
      {settings?.announcementText && (
        <div className="bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-slate-950 text-xs font-bold py-2 px-4 text-center truncate shadow-md">
          {settings.announcementText}
        </div>
      )}

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[var(--surface-base)]/90 backdrop-blur-md border-b border-[var(--ink)]/10 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center font-black text-slate-950 text-xl shadow-lg">
            {(storeInfo?.name || 'N').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-primary tracking-tight">
              {settings?.storeName || storeInfo?.name || 'Storefront'}
            </h1>
            <p className="text-[11px] text-muted flex items-center gap-1.5">
              <Globe size={12} className="text-[var(--brand-green-ink)]" />
              <span>{settings?.customDomain || `${storeSlug}.nexuscommerce.io`}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-[var(--ink)]/5 hover:bg-[var(--ink)]/10 text-xs font-semibold text-body hover:text-primary transition-colors"
            >
              Exit Preview
            </button>
          )}

          <button
            onClick={() => setCartOpen(true)}
            className="relative px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--ink)]/10 to-[var(--ink)]/5 hover:from-[var(--ink)]/15 hover:to-[var(--ink)]/10 border border-[var(--ink)]/10 text-xs font-bold text-primary flex items-center gap-2 shadow-lg transition-colors"
          >
            <ShoppingBag size={16} className="text-[var(--brand-yellow-ink)]" />
            <span>Bag</span>
            {itemCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#FF5F56] text-white text-[10px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Hero & Catalog */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Hero Section */}
        <section className="relative rounded-3xl p-8 sm:p-14 border border-[var(--ink)]/10 overflow-hidden bg-gradient-to-b from-[var(--ink)]/[0.04] via-[var(--ink)]/[0.02] to-transparent shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFBD2E]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--ink)]/10 border border-[var(--ink)]/15 text-[var(--brand-yellow-ink)]">
              Featured Catalog 2026
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-primary tracking-tight leading-tight">
              Curated Essentials & Timeless Crafts
            </h2>
            <p className="text-sm sm:text-base text-secondary leading-relaxed">
              Explore premium products with fast worldwide shipping, effortless returns, and secure server-checked checkout.
            </p>
          </div>
        </section>

        {/* Catalog Control Bar (Search, Category Filters, Sort) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input aria-label="Search products"
                type="text"
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-primary text-xs placeholder:text-muted focus:outline-none focus:border-[#FFBD2E] transition-colors"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-muted font-medium">Sort by:</span>
              <select
                aria-label="Sort products"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-primary text-xs focus:outline-none focus:border-[#FFBD2E]"
              >
                <option value="newest" className="bg-slate-900">Newest Arrivals</option>
                <option value="price_asc" className="bg-slate-900">Price: Low to High</option>
                <option value="price_desc" className="bg-slate-900">Price: High to Low</option>
                <option value="title_asc" className="bg-slate-900">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--ink)]/10">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                selectedCategory === 'all'
                  ? 'bg-[#FFBD2E] text-slate-950 font-bold shadow-md'
                  : 'bg-[var(--ink)]/5 text-secondary hover:bg-[var(--ink)]/10 hover:text-primary'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-[#FFBD2E] text-slate-950 font-bold shadow-md'
                    : 'bg-[var(--ink)]/5 text-secondary hover:bg-[var(--ink)]/10 hover:text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {productsQuery.isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#FFBD2E] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted">Loading storefront catalog…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center glass rounded-2xl border border-[var(--ink)]/10 p-8 space-y-3">
            <ShoppingBag size={40} className="text-muted mx-auto" />
            <h3 className="text-lg font-bold text-primary">No active products found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Check back soon for new arrivals or try adjusting your search filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleOpenProduct(prod)}
                className="glass rounded-2xl p-4 border border-[var(--ink)]/10 hover:border-[var(--ink)]/25 transition-colors group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Product Image */}
                  <div className="aspect-square rounded-xl bg-[var(--ink)]/5 mb-4 overflow-hidden relative flex items-center justify-center">
                    {prod.primaryImage ? (
                      <img
                        src={getAssetUrl(prod.primaryImage)}
                        alt={prod.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <ShoppingBag size={40} className="text-muted group-hover:scale-110 transition-transform" />
                    )}

                    <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md border ${
                      prod.inStock
                        ? 'bg-[#27C93F]/20 border-[#27C93F]/40 text-[var(--brand-green-ink)]'
                        : 'bg-[#FF5F56]/20 border-[#FF5F56]/40 text-[var(--brand-red-ink)]'
                    }`}>
                      {prod.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  {/* Category & Title */}
                  <div className="text-[10px] uppercase font-bold text-[var(--brand-yellow-ink)] tracking-wider mb-1">
                    {prod.category}
                  </div>
                  <h4 className="font-bold text-primary text-base mb-2 line-clamp-1 group-hover:text-[var(--brand-yellow-ink)] transition-colors">
                    {prod.title}
                  </h4>
                  <p className="text-xs text-muted line-clamp-2 leading-relaxed mb-4">
                    {prod.description}
                  </p>
                </div>

                {/* Price & Action */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--ink)]/10">
                  <div>
                    <span className="font-extrabold text-primary text-lg">${prod.price.toFixed(2)}</span>
                    {prod.comparePrice && prod.comparePrice > prod.price && (
                      <span className="text-xs text-muted line-through ml-2">
                        ${prod.comparePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenProduct(prod);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--ink)]/10 hover:bg-[var(--ink)]/20 text-primary text-xs font-bold transition-colors"
                  >
                    Quick View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-3xl border border-[var(--ink)]/15 max-w-2xl w-full p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl">
            <button aria-label="Close"
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-[var(--ink)]/10 hover:bg-[var(--ink)]/20 text-body hover:text-primary transition-colors"
            >
              <X size={18} />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              {/* Product Main Image */}
              <div className="aspect-square rounded-2xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 overflow-hidden flex items-center justify-center">
                {selectedProduct.primaryImage ? (
                  <img loading="lazy" decoding="async" src={getAssetUrl(selectedProduct.primaryImage)} alt={selectedProduct.title} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag size={48} className="text-muted" />
                )}
              </div>

              {/* Product Details Form */}
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--brand-yellow-ink)] tracking-wider">{selectedProduct.category}</span>
                  <h3 className="text-2xl font-extrabold text-primary mt-1">{selectedProduct.title}</h3>
                  <p className="text-xs text-muted font-mono mt-0.5">SKU: {selectedProduct.sku}</p>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-black text-[var(--brand-green-ink)]">
                    ${(selectedVariant ? selectedVariant.price : selectedProduct.price).toFixed(2)}
                  </span>
                  {selectedProduct.comparePrice && (
                    <span className="text-xs text-muted line-through">
                      ${selectedProduct.comparePrice.toFixed(2)}
                    </span>
                  )}
                </div>

                <p className="text-xs text-body leading-relaxed max-h-28 overflow-y-auto">
                  {selectedProduct.description || 'No description provided.'}
                </p>

                {/* Variant Selector */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-body">Select Option / Variant:</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.variants.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                            selectedVariant?.id === v.id
                              ? 'bg-[#FFBD2E] text-slate-950 border-[#FFBD2E] font-bold shadow-md'
                              : 'bg-[var(--ink)]/5 border-[var(--ink)]/10 text-body hover:border-[var(--ink)]/30'
                          }`}
                        >
                          {v.title} (${v.price.toFixed(2)})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Stepper */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-semibold text-body">Quantity:</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-[var(--ink)]/15 rounded-xl bg-[var(--ink)]/5">
                      <button aria-label="Remove"
                        onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                        className="p-2 text-body hover:text-primary"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-4 font-bold text-xs text-primary">{modalQuantity}</span>
                      <button aria-label="Add"
                        onClick={() => setModalQuantity(modalQuantity + 1)}
                        className="p-2 text-body hover:text-primary"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-[11px] text-muted">
                      {selectedVariant
                        ? `${selectedVariant.inventoryQuantity} units available`
                        : `${selectedProduct.availableStock} units available`}
                    </span>
                  </div>
                </div>

                {/* Add to Bag Button */}
                <button
                  onClick={handleAddToCartModal}
                  disabled={!selectedProduct.inStock}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-slate-950 font-extrabold text-sm shadow-xl hover:opacity-95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedProduct.inStock ? 'Add to Bag' : 'Out of Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Slide-Over */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[var(--surface-base)] border-l border-[var(--ink)]/10 h-full p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--ink)]/10 pb-4">
                <h3 className="font-extrabold text-lg text-primary flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[var(--brand-yellow-ink)]" /> Your Shopping Bag ({itemCount})
                </h3>
                <button aria-label="Close" onClick={() => setCartOpen(false)} className="p-1.5 rounded-lg bg-[var(--ink)]/10 hover:bg-[var(--ink)]/20 text-primary">
                  <X size={18} />
                </button>
              </div>

              {items.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <ShoppingBag size={48} className="text-muted mx-auto" />
                  <p className="text-xs text-muted">Your bag is currently empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.variantId} className="p-3.5 rounded-2xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 flex items-center justify-between gap-3">
                      <div className="w-14 h-14 rounded-xl bg-[var(--ink)]/10 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.image ? (
                          <img loading="lazy" decoding="async" src={getAssetUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag size={20} className="text-muted" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs text-primary truncate">{item.title}</h5>
                        {item.variantTitle && <p className="text-[11px] text-muted">{item.variantTitle}</p>}
                        <p className="text-xs font-bold text-[var(--brand-green-ink)] mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-[var(--ink)]/10 rounded-lg bg-[var(--surface-3)]">
                          <button aria-label="Remove" onClick={() => updateQuantity(item.variantId, item.quantity - 1)} className="p-1 text-secondary hover:text-primary">
                            <Minus size={12} />
                          </button>
                          <span className="px-2 text-xs font-bold text-primary">{item.quantity}</span>
                          <button aria-label="Add" onClick={() => updateQuantity(item.variantId, item.quantity + 1)} className="p-1 text-secondary hover:text-primary">
                            <Plus size={12} />
                          </button>
                        </div>
                        <button aria-label="Delete" onClick={() => removeFromCart(item.variantId)} className="p-1.5 text-muted hover:text-[var(--brand-red-ink)]">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary Footer */}
            {items.length > 0 && (
              <div className="border-t border-[var(--ink)]/10 pt-4 space-y-4">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-secondary">
                    <span>Subtotal</span>
                    <span className="font-mono text-primary">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-secondary">
                    <span>Estimated Tax (8%)</span>
                    <span className="font-mono text-primary">${taxEstimate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-secondary">
                    <span>Shipping</span>
                    <span className="font-mono text-primary">
                      {shippingEstimate === 0 ? <span className="text-[var(--brand-green-ink)] font-bold">FREE</span> : `$${shippingEstimate.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-primary pt-2 border-t border-[var(--ink)]/10">
                    <span>Total Estimate</span>
                    <span className="font-mono text-[var(--brand-green-ink)]">${totalEstimate.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutModalOpen(true);
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-slate-950 font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 hover:opacity-95 transition-colors"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Checkout Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass rounded-3xl border border-[var(--ink)]/15 max-w-xl w-full p-6 sm:p-8 space-y-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--ink)]/10 pb-4">
              <h3 className="font-extrabold text-lg text-primary flex items-center gap-2">
                <ShieldCheck size={20} className="text-[var(--brand-green-ink)]" /> Express Customer Checkout
              </h3>
              <button aria-label="Close" onClick={() => setCheckoutModalOpen(false)} className="p-1.5 rounded-lg bg-[var(--ink)]/10 hover:bg-[var(--ink)]/20 text-primary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
              {/* Contact Information */}
              <div className="space-y-3 p-4 rounded-2xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                <h4 className="font-bold text-primary text-xs uppercase tracking-wider text-[var(--brand-yellow-ink)]">1. Customer Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-secondary mb-1">Full Name *</label>
                    <input aria-label="Jane Customer"
                      type="text"
                      required
                      placeholder="Jane Customer"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--ink)]/10 text-primary focus:outline-none focus:border-[#FFBD2E]"
                    />
                  </div>
                  <div>
                    <label className="block text-secondary mb-1">Email Address *</label>
                    <input aria-label="jane@example.com"
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--ink)]/10 text-primary focus:outline-none focus:border-[#FFBD2E]"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-3 p-4 rounded-2xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                <h4 className="font-bold text-primary text-xs uppercase tracking-wider text-[var(--brand-yellow-ink)]">2. Shipping Address</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-secondary mb-1">First Name *</label>
                    <input aria-label="Jane"
                      type="text"
                      required
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--ink)]/10 text-primary focus:outline-none focus:border-[#FFBD2E]"
                    />
                  </div>
                  <div>
                    <label className="block text-secondary mb-1">Last Name *</label>
                    <input aria-label="Doe"
                      type="text"
                      required
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--ink)]/10 text-primary focus:outline-none focus:border-[#FFBD2E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-secondary mb-1">Address Line 1 *</label>
                  <input aria-label="123 Commerce Way"
                    type="text"
                    required
                    placeholder="123 Commerce Way"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--ink)]/10 text-primary focus:outline-none focus:border-[#FFBD2E]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-secondary mb-1">City *</label>
                    <input aria-label="Seattle"
                      type="text"
                      required
                      placeholder="Seattle"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--ink)]/10 text-primary focus:outline-none focus:border-[#FFBD2E]"
                    />
                  </div>
                  <div>
                    <label className="block text-secondary mb-1">State *</label>
                    <input aria-label="WA"
                      type="text"
                      required
                      placeholder="WA"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--ink)]/10 text-primary focus:outline-none focus:border-[#FFBD2E]"
                    />
                  </div>
                  <div>
                    <label className="block text-secondary mb-1">ZIP *</label>
                    <input aria-label="98101"
                      type="text"
                      required
                      placeholder="98101"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--ink)]/10 text-primary focus:outline-none focus:border-[#FFBD2E]"
                    />
                  </div>
                </div>
              </div>

              {/* Promo Code & Discount Application */}
              <div className="p-4 rounded-2xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-2">
                <label className="block text-secondary mb-1 font-bold">Have a Discount Code?</label>
                <div className="flex gap-2">
                  <input aria-label="e.g. SUMMER20"
                    type="text"
                    placeholder="e.g. SUMMER20"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3.5 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--ink)]/10 text-primary font-mono uppercase focus:outline-none focus:border-[#FFBD2E]"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!discountCode.trim()) return;
                      try {
                        const { validateDiscountApi } = await import('../../api/discounts');
                        const res = await validateDiscountApi(discountCode, subtotal, storeSlug);
                        if (res.valid) {
                          toast.success(res.message || 'Discount applied!', { icon: '🎉' });
                        } else {
                          toast.error(res.message || 'Invalid code');
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'Discount validation failed');
                      }
                    }}
                    className="px-4 py-2 bg-[#FFBD2E] text-slate-950 font-bold rounded-lg hover:brightness-110 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Order Summary & Submit */}
              <div className="p-4 rounded-2xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-2">
                <div className="flex justify-between text-body">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-body">
                  <span>Tax (8%)</span>
                  <span>${taxEstimate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-body">
                  <span>Shipping</span>
                  <span>{shippingEstimate === 0 ? 'FREE' : `$${shippingEstimate.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-[var(--brand-green-ink)] pt-2 border-t border-[var(--ink)]/10">
                  <span>Total Amount</span>
                  <span>${totalEstimate.toFixed(2)}</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={checkoutMut.isPending || isInitializingPayment}
                className="w-full py-3.5 text-sm font-extrabold rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-slate-950"
              >
                Place Order (${totalEstimate.toFixed(2)})
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirmation Screen */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass rounded-3xl border border-[var(--ink)]/15 max-w-lg w-full p-8 text-center space-y-6 shadow-2xl relative">
            <div className={cn(
              'w-16 h-16 rounded-full border flex items-center justify-center mx-auto shadow-lg',
              orderIsPaid
                ? 'bg-[#27C93F]/20 text-[var(--brand-green-ink)] border-[#27C93F]/40'
                : 'bg-[#FFBD2E]/20 text-[var(--brand-yellow-ink)] border-[#FFBD2E]/40'
            )}>
              {orderIsPaid ? <CheckCircle2 size={36} /> : <Clock size={36} />}
            </div>

            <div>
              <span className={cn(
                'text-[10px] font-bold uppercase tracking-widest',
                orderIsPaid ? 'text-[var(--brand-green-ink)]' : 'text-[var(--brand-yellow-ink)]'
              )}>
                {orderIsPaid ? 'Order Confirmed' : 'Awaiting Payment'}
              </span>
              <h3 className="text-2xl font-extrabold text-primary mt-1">
                {orderIsPaid ? 'Thank you for your order!' : 'Your order is saved'}
              </h3>
              <p className="text-xs text-secondary mt-1">
                Order <span className="font-mono text-[var(--brand-yellow-ink)] font-bold">{completedOrder.orderNumber}</span>
                {orderIsPaid
                  ? ' has been confirmed.'
                  : ' was created, but payment has not been completed yet.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-left text-xs space-y-2">
              <div className="flex justify-between text-body">
                <span>Customer</span>
                <span className="text-primary font-semibold">{completedOrder.customerName} ({completedOrder.customerEmail})</span>
              </div>
              <div className="flex justify-between text-body">
                <span>Payment Status</span>
                <span className="text-[var(--brand-yellow-ink)] font-bold">{completedOrder.paymentStatus}</span>
              </div>
              <div className="flex justify-between text-body">
                <span>Total Paid</span>
                <span className="text-[var(--brand-green-ink)] font-bold font-mono">${completedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full py-3 font-bold rounded-xl"
              onClick={() => setCompletedOrder(null)}
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--ink)]/10 py-6 text-center text-xs text-muted">
        Powered by <span className="font-bold text-primary">Nexus Commerce</span> • Multi-tenant Storefront Platform
      </footer>
    </div>
  );
}

export function StorefrontView({ storeSlug, onClose }: StorefrontViewProps) {
  const { storeSlug: routeSlug } = useParams<{ storeSlug?: string }>();
  const resolvedSlug = storeSlug || routeSlug;

  if (!resolvedSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-sunken)] px-6">
        <p className="text-sm text-muted text-center">
          No storefront specified. Open a store from its own link.
        </p>
      </div>
    );
  }

  return (
    // A merchant's own storefront keeps its own cart scope, separate from the
    // marketplace cart in the app shell. The nested provider shadows it.
    <CartProvider scope={`store_${resolvedSlug}`}>
      <StorefrontContent storeSlug={resolvedSlug} onClose={onClose} />
    </CartProvider>
  );
}
