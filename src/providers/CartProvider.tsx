import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { Product, ProductVariant } from '../features/catalogue/catalogue';
import {
  addItemToList,
  computeSubtotal,
  computeTotalCount,
  createCartItem,
  reconcileCartWithCatalog,
  removeItemFromList,
  updateQuantityInList,
  type CartItem,
} from '../features/cart/logic';
import {
  addRemoteCartItem,
  clearGuestCart,
  clearRemoteCart,
  deleteRemoteCartItem,
  fetchRemoteCart,
  loadGuestCart,
  mergeGuestCartIntoRemote,
  saveGuestCart,
  updateRemoteCartQuantity,
} from '../features/cart/cartService';
import { useAuth } from './AuthProvider';
import { useCatalogue } from './CatalogueProvider';

type CartContextValue = {
  items: CartItem[];
  totalCount: number;
  subtotal: number;
  loading: boolean;
  addItem: (product: Product, variant: ProductVariant | null, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { products } = useCatalogue();
  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null>(null);

  // Load cart on auth change
  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      if (userId) {
        // If transitioning from guest to logged-in user, merge guest items
        if (prevUserIdRef.current === null) {
          const guestItems = await loadGuestCart();
          if (guestItems.length > 0) {
            await mergeGuestCartIntoRemote(userId, guestItems);
          }
        }
        const remoteItems = await fetchRemoteCart(userId);
        setItems(remoteItems);
      } else {
        const guestItems = await loadGuestCart();
        setItems(guestItems);
      }
    } catch (err) {
      console.error('Failed to load cart:', err);
    } finally {
      setLoading(false);
      prevUserIdRef.current = userId;
    }
  }, [userId]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Reconcile cart items when catalogue products load/update
  useEffect(() => {
    if (products.length > 0 && items.length > 0) {
      const { reconciled, hasChanges } = reconcileCartWithCatalog(items, products);
      if (hasChanges) {
        setItems(reconciled);
        if (!userId) {
          saveGuestCart(reconciled);
        }
      }
    }
  }, [products]); // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = useCallback(
    async (product: Product, variant: ProductVariant | null, quantity = 1) => {
      const tempId = `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newItem = createCartItem(tempId, product, variant, quantity);

      // Optimistic update
      setItems((prev) => {
        const updated = addItemToList(prev, newItem);
        if (!userId) {
          saveGuestCart(updated);
        }
        return updated;
      });

      // Remote sync if logged in
      if (userId) {
        try {
          const realId = await addRemoteCartItem(userId, product, variant, quantity);
          setItems((prev) =>
            prev.map((item) => (item.id === tempId ? { ...item, id: realId } : item))
          );
        } catch (err) {
          console.error('Failed to sync added cart item to server:', err);
          // Rollback on failure by reloading remote
          loadCart();
        }
      }
    },
    [userId, loadCart]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      setItems((prev) => {
        const updated = updateQuantityInList(prev, itemId, quantity);
        if (!userId) {
          saveGuestCart(updated);
        }
        return updated;
      });

      if (userId) {
        try {
          if (quantity <= 0) {
            await deleteRemoteCartItem(itemId);
          } else {
            await updateRemoteCartQuantity(itemId, quantity);
          }
        } catch (err) {
          console.error('Failed to update remote cart quantity:', err);
          loadCart();
        }
      }
    },
    [userId, loadCart]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      setItems((prev) => {
        const updated = removeItemFromList(prev, itemId);
        if (!userId) {
          saveGuestCart(updated);
        }
        return updated;
      });

      if (userId) {
        try {
          await deleteRemoteCartItem(itemId);
        } catch (err) {
          console.error('Failed to delete remote cart item:', err);
          loadCart();
        }
      }
    },
    [userId, loadCart]
  );

  const clearCart = useCallback(async () => {
    setItems([]);
    if (userId) {
      try {
        await clearRemoteCart(userId);
      } catch (err) {
        console.error('Failed to clear remote cart:', err);
      }
    } else {
      await clearGuestCart();
    }
  }, [userId]);

  const subtotal = useMemo(() => computeSubtotal(items), [items]);
  const totalCount = useMemo(() => computeTotalCount(items), [items]);

  const value = useMemo(
    () => ({
      items,
      totalCount,
      subtotal,
      loading,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      refreshCart: loadCart,
    }),
    [items, totalCount, subtotal, loading, addItem, updateQuantity, removeItem, clearCart, loadCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider.');
  }
  return context;
}
