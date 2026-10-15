import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';

export interface CartItem {
  variantId: string;
  productId: string;
  title: string;
  variantTitle?: string;
  price: number;
  sku: string;
  image: string;
  quantity: number;
  maxStock: number;
  /**
   * The selling store. Optional only for backwards compatibility with carts
   * written before the marketplace existed; every item added from the
   * marketplace carries it, and checkout needs it because an order belongs to
   * exactly one merchant.
   */
  storeId?: string;
  storeName?: string;
  /** Product slug, so the cart can link back to the product page. */
  productSlug?: string;
}

/** One merchant's lines within the cart. Checkout runs per group. */
export interface CartStoreGroup {
  storeId: string;
  storeName: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

/** A server-side correction applied to one line after revalidation. */
export interface CartCorrection {
  variantId: string;
  price?: number;
  maxStock?: number;
  remove?: boolean;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  /** Cart lines grouped by selling store, in insertion order. */
  groups: CartStoreGroup[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  /** Drop one store's lines, e.g. after that group's order is placed. */
  clearStore: (storeId: string) => void;
  /** Apply trusted server values to the cart after a validation round-trip. */
  reconcile: (corrections: CartCorrection[]) => void;
}

const CartContext = createContext<CartContextType | null>(null);

const GUEST = 'guest';

/**
 * Storage key for one scope and identity.
 *
 * Signed-in keys carry a `u_` prefix so a user id can never be mistaken for
 * the literal guest identity.
 */
function keyFor(scope: string, identity: string) {
  return `nexus_cart_${scope}_${identity === GUEST ? GUEST : `u_${identity}`}`;
}

function readCart(storageKey: string): CartItem[] {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt or blocked store must not take the page down with it.
    return [];
  }
}

function writeCart(storageKey: string, items: CartItem[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

/** Upper bound for a line. `maxStock` of 0 means "not tracked", not "none left". */
function cap(item: CartItem) {
  return item.maxStock && item.maxStock > 0 ? item.maxStock : 99;
}

/**
 * Fold `incoming` into `base`, summing quantities for lines that are the same
 * product variant and clamping each to the stock the item was added with.
 */
export function mergeCartItems(base: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged = base.map(i => ({ ...i }));

  for (const item of incoming) {
    const existing = merged.find(i => i.variantId === item.variantId);
    if (existing) {
      // Trust the newer stock figure, then clamp the combined quantity to it.
      existing.maxStock = item.maxStock ?? existing.maxStock;
      existing.price = item.price ?? existing.price;
      existing.quantity = Math.min(existing.quantity + item.quantity, cap(existing));
    } else {
      merged.push({ ...item, quantity: Math.min(item.quantity, cap(item)) });
    }
  }

  return merged;
}

interface CartProviderProps {
  children: ReactNode;
  /**
   * Which catalogue this cart belongs to: a single store handle for a per-store
   * storefront, or `marketplace` for the public Nexus storefront. Carts in
   * different scopes are independent.
   */
  scope: string;
  /**
   * The signed-in user's id, or null/undefined for a guest.
   *
   * The cart is stored per identity so a shared device cannot hand one
   * customer's cart to the next person who signs in. When a guest signs in,
   * the guest cart is merged into theirs rather than discarded.
   */
  identityKey?: string | null;
}

export function CartProvider({ children, scope, identityKey }: CartProviderProps) {
  const identity = identityKey || GUEST;
  const storageKey = keyFor(scope, identity);

  const [items, setItems] = useState<CartItem[]>(() => {
    const current = readCart(keyFor(scope, identityKey || GUEST));
    if (current.length) return current;
    // Carts written before scoping existed lived at `nexus_cart_<scope>`.
    const legacy = readCart(`nexus_cart_${scope}`);
    return legacy;
  });

  const [cartOpen, setCartOpen] = useState(false);

  /**
   * Identity changes are the interesting transitions:
   *  - guest -> user: merge the guest cart into the user's and clear the guest
   *    one, so nothing the visitor chose while signed out is lost.
   *  - user -> guest (sign-out) or user -> other user: load that identity's own
   *    cart and never carry the previous one over.
   */
  const previousIdentity = useRef(identity);
  useEffect(() => {
    const from = previousIdentity.current;
    if (from === identity) return;
    previousIdentity.current = identity;

    if (from === GUEST && identity !== GUEST) {
      const guestKey = keyFor(scope, GUEST);
      const guestItems = readCart(guestKey);
      const userItems = readCart(storageKey);
      const merged = mergeCartItems(userItems, guestItems);

      // Only drop the guest copy once the merged cart is safely written; if
      // storage rejects the write the guest cart is still there to retry from.
      const persisted = writeCart(storageKey, merged);
      if (persisted && guestItems.length) {
        try {
          localStorage.removeItem(guestKey);
        } catch {
          // Leaving a stale guest cart behind is harmless — it merges again.
        }
      }
      setItems(merged);
      return;
    }

    setItems(readCart(storageKey));
  }, [identity, scope, storageKey]);

  useEffect(() => {
    writeCart(storageKey, items);
  }, [items, storageKey]);

  // Clear the pre-scoping key once, so it cannot resurrect a stale cart later.
  useEffect(() => {
    try {
      localStorage.removeItem(`nexus_cart_${scope}`);
    } catch {
      /* nothing to clean up */
    }
  }, [scope]);

  const addToCart = useCallback((newItem: CartItem) => {
    setItems(prev => mergeCartItems(prev, [newItem]));
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((variantId: string) => {
    setItems(prev => prev.filter(item => item.variantId !== variantId));
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.variantId !== variantId));
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.variantId === variantId ? { ...item, quantity: Math.min(quantity, cap(item)) } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const clearStore = useCallback((storeId: string) => {
    setItems(prev => prev.filter(item => item.storeId !== storeId));
  }, []);

  const reconcile = useCallback((corrections: CartCorrection[]) => {
    if (!corrections.length) return;
    const byVariant = new Map(corrections.map(c => [c.variantId, c]));

    setItems(prev =>
      prev
        .filter(item => !byVariant.get(item.variantId)?.remove)
        .map(item => {
          const fix = byVariant.get(item.variantId);
          if (!fix) return item;
          const maxStock = fix.maxStock ?? item.maxStock;
          const next: CartItem = {
            ...item,
            price: fix.price ?? item.price,
            maxStock,
          };
          next.quantity = Math.min(next.quantity, cap(next));
          return next;
        })
        .filter(item => item.quantity > 0)
    );
  }, []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const groups = useMemo<CartStoreGroup[]>(() => {
    const order: string[] = [];
    const byStore = new Map<string, CartStoreGroup>();

    for (const item of items) {
      const storeId = item.storeId || 'unknown';
      if (!byStore.has(storeId)) {
        order.push(storeId);
        byStore.set(storeId, {
          storeId,
          storeName: item.storeName || 'Nexus store',
          items: [],
          subtotal: 0,
          itemCount: 0,
        });
      }
      const group = byStore.get(storeId)!;
      group.items.push(item);
      group.subtotal += item.price * item.quantity;
      group.itemCount += item.quantity;
    }

    return order.map(id => byStore.get(id)!);
  }, [items]);

  const value = useMemo<CartContextType>(
    () => ({
      items,
      itemCount,
      subtotal,
      groups,
      cartOpen,
      setCartOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      clearStore,
      reconcile,
    }),
    [items, itemCount, subtotal, groups, cartOpen, addToCart, updateQuantity, removeFromCart, clearCart, clearStore, reconcile]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
