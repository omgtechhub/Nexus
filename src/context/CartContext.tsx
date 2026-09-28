import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children, storeSlug }: { children: ReactNode; storeSlug: string }) {
  const storageKey = `nexus_cart_${storeSlug || 'default'}`;

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [items, storageKey]);

  const addToCart = useCallback((newItem: CartItem) => {
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.variantId === newItem.variantId);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const currentQty = updated[existingIndex].quantity;
        const newQty = Math.min(currentQty + newItem.quantity, newItem.maxStock || 99);
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      }
      return [...prevItems, newItem];
    });
    setCartOpen(true);
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.min(quantity, item.maxStock || 99) }
          : item
      )
    );
  }, []);

  const removeFromCart = useCallback((variantId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.variantId !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        cartOpen,
        setCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
